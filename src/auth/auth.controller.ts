import { Controller, Post, Body, HttpCode, HttpStatus, Get, Request, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto } from './dto/password.dto';
import { Public } from './decorators/public.decorator';
import type { Response as ExpressResponse, Request as ExpressRequest } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 login attempts per minute
  @Post('login')
  @ApiOperation({ 
    summary: 'User login authentication',
    description: 'Authenticate user with username/email/employee ID and password. Returns JWT token for authorized access.'
  })
  @ApiBody({ 
    type: LoginDto,
    description: 'Login credentials - Use username, email, or employee ID with password'
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful - Returns JWT token and user information',
    type: AuthResponseDto,
    schema: {
      example: {
        success: true,
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 1,
          username: 'EMP-0001',
          email: 'john.doe@company.com',
          name: 'John Doe',
          employeeId: 'EMP-0001'
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
    schema: {
      example: {
        message: ['username should not be empty', 'password should not be empty'],
        error: 'Bad Request',
        statusCode: 400
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid credentials',
    schema: {
      example: {
        message: 'Invalid credentials',
        error: 'Unauthorized',
        statusCode: 401
      }
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error - Authentication system failure',
    schema: {
      example: {
        message: 'Authentication failed',
        error: 'Internal Server Error',
        statusCode: 500
      }
    }
  })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: ExpressResponse
  ): Promise<AuthResponseDto> {
    // Extract device info
    const deviceInfo = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      deviceId: req.headers['x-device-id'] as string
    };

    const result = await this.authService.login(loginDto, deviceInfo);

    // Set HTTP-only cookies
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/'
    });

    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });

    // Return response without tokens (they're in cookies now)
    return {
      success: result.success,
      access_token: result.access_token, // Still return for backwards compatibility during migration
      user: result.user
    };
  }

  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get current user profile',
    description: 'Get authenticated user profile information including user details and roles'
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          username: 'john.doe',
          email: 'john.doe@company.com',
          name: 'John Doe',
          employeeId: 'EMP001',
          employee: {
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@company.com',
            department: 'IT',
            position: 'Software Engineer'
          },
          roles: ['USER', 'ADMIN'],
          lastLogin: '2025-09-28T17:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token',
    schema: {
      example: {
        message: 'Unauthorized',
        statusCode: 401
      }
    }
  })
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ 
    summary: 'Refresh access token',
    description: 'Refresh the access token to extend session'
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      example: {
        success: true,
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expires_in: 900
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or expired token' })
  async refreshToken(
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: ExpressResponse,
    @Body('refresh_token') bodyRefreshToken?: string
  ) {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies?.refresh_token || bodyRefreshToken;
    
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    // Extract device info
    const deviceInfo = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      deviceId: req.headers['x-device-id'] as string
    };

    const result = await this.authService.refreshToken(refreshToken, deviceInfo);

    // Set new cookies
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/'
    });

    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    return {
      success: result.success,
      access_token: result.access_token, // Backwards compatibility
      expires_in: result.expires_in
    };
  }

  @Post('logout')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'User logout',
    description: 'Logout user and invalidate refresh token'
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      example: {
        success: true,
        message: 'Logged out successfully'
      }
    }
  })
  async logout(
    @Request() req: any,
    @Req() request: ExpressRequest,
    @Res({ passthrough: true }) res: ExpressResponse
  ) {
    // Extract tokens
    const accessToken = req.headers.authorization?.split(' ')[1] || request.cookies?.access_token;
    const refreshToken = request.cookies?.refresh_token;

    const result = await this.authService.logout(req.user.id, accessToken, refreshToken);

    // Clear cookies
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });

    return result;
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 attempts per minute
  @ApiOperation({ 
    summary: 'Request password reset',
    description: 'Send password reset email to the user'
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Reset email sent successfully',
    schema: {
      example: {
        message: 'If your email is registered with us, you will receive a password reset link shortly.'
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid email format' 
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Reset password using token',
    description: 'Reset user password with a valid reset token'
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Password reset successful',
    schema: {
      example: {
        message: 'Password successfully reset'
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Invalid or expired reset token' 
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('change-password')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Change user password',
    description: 'Change password for authenticated user'
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Password changed successfully',
    schema: {
      example: {
        message: 'Password changed successfully'
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Current password is incorrect' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid password format' 
  })
  async changePassword(
    @Request() req: any,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    return await this.authService.changePassword(
      req.user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword
    );
  }
} 
import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ 
    summary: 'User login authentication',
    description: 'Authenticate user with username/email and password. Returns JWT token for authorized access.'
  })
  @ApiBody({ 
    type: LoginDto,
    description: 'Login credentials - Use username or email with password'
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
          username: 'john.doe',
          email: 'john.doe@company.com',
          name: 'John Doe',
          employeeId: 'EMP001'
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
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
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

  @Post('refresh')
  @ApiBearerAuth('JWT-auth')
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
  async refreshToken(@Request() req: any) {
    return this.authService.refreshToken(req.user.id);
  }
} 
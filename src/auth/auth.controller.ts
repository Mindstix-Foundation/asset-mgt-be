import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
} 
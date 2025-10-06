import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({
    description: 'Unique user identifier',
    example: 1,
    type: 'number',
  })
  id: number;

  @ApiProperty({
    description: 'Username for authentication',
    example: 'john.doe',
    type: 'string',
  })
  username: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@company.com',
    type: 'string',
  })
  email: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
    type: 'string',
  })
  name: string;

  @ApiProperty({
    description: 'Employee ID associated with the user',
    example: 'EMP001',
    type: 'string',
  })
  employeeId: string;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'Authentication success status',
    example: true,
    type: 'boolean',
  })
  success: boolean;

  @ApiProperty({
    description: 'JWT access token for API authentication',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInVzZXJuYW1lIjoiam9obi5kb2UiLCJlbWFpbCI6ImpvaG4uZG9lQGNvbXBhbnkuY29tIiwiZW1wbG95ZWVJZCI6MTIzNDUsImlhdCI6MTcwNTMxNjQwMCwiZXhwIjoxNzA1NDAyODAwfQ.signature',
    type: 'string',
  })
  access_token: string;

  @ApiProperty({
    description: 'Refresh token for obtaining new access tokens',
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
    type: 'string',
    required: false,
  })
  refresh_token?: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 900,
    type: 'number',
    required: false,
  })
  expires_in?: number;

  @ApiProperty({
    description: 'Authenticated user information',
    type: UserDto,
  })
  user: UserDto;
}

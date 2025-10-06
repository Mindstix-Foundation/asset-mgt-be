import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Username, email address, or employee ID for authentication',
    example: 'EMP-0001',
    type: String,
    required: true,
    minLength: 1,
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: 'User password',
    example: 'securePassword123',
    type: String,
    required: true,
    minLength: 1,
    format: 'password'
  })
  @IsString()
  @IsNotEmpty()
  password: string;
} 
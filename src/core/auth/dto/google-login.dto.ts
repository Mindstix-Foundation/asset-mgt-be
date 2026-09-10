import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({
    description: 'Google ID token (credential) from Google Identity Services',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6I...',
  })
  @IsString()
  @IsNotEmpty()
  credential: string;

  @ApiProperty({
    description:
      'When true, issues a long-lived refresh session (30 days) and persistent cookies.',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  remember_me?: boolean;
}

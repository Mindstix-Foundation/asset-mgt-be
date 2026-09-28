import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class GoogleCodeLoginDto {
  @ApiProperty({
    description:
      'OAuth authorization code returned by Google OAuth2 code client',
    example: '4/0AQSTgQF....',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'Redirect URI used by frontend OAuth code flow',
    example: 'http://localhost:5173',
  })
  @IsString()
  @IsUrl({ require_tld: false })
  redirect_uri: string;

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

import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBrandDto {
  @ApiProperty({
    description: 'Name of the brand',
    example: 'Apple',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the brand',
    example: 'Premium technology brand',
  })
  @IsOptional()
  @IsString()
  description?: string;
} 
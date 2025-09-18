import { IsString, IsInt, IsOptional, IsBoolean, MaxLength, MinLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateAssetTypeDto {
  @ApiProperty({
    description: 'ID of the asset category',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId: number;

  @ApiProperty({
    description: 'Name of the asset type',
    example: 'Laptop',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the asset type',
    example: 'Portable computing devices',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the asset type is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
} 
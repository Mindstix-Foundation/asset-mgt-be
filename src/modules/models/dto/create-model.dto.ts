import { IsString, IsInt, IsOptional, IsObject, MaxLength, MinLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateModelDto {
  @ApiProperty({
    description: 'ID of the brand',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  brandId: number;

  @ApiProperty({
    description: 'ID of the asset type',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assetTypeId: number;

  @ApiProperty({
    description: 'Name of the model',
    example: 'MacBook Pro 16"',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Technical specifications in JSON format',
    example: {
      processor: 'Apple M2 Pro',
      ram: '16GB',
      storage: '512GB SSD',
      display: '16.2-inch Liquid Retina XDR'
    },
  })
  @IsOptional()
  @IsObject()
  specifications?: Record<string, any>;
} 
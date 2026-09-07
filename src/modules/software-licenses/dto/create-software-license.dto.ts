import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsDateString,
  IsBoolean,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class CreateSoftwareLicenseDto {
  @ApiProperty({ example: 'Microsoft 365 Business' })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name: string;

  @ApiProperty({
    description: 'Employee responsible for this license (e.g. team lead)',
    example: 12,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assignedToId: number;

  @ApiPropertyOptional({ example: 'Microsoft' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  vendorName?: string;

  @ApiPropertyOptional({ example: 'XXXX-XXXX-XXXX' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  licenseKey?: string;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seats?: number;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional({ example: 12000 })
  @IsOptional()
  @Transform(({ value }) => (value ? Number.parseFloat(value) : value))
  @IsNumber({ maxDecimalPlaces: 2 })
  purchaseCost?: number;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: '2025-12-31' })
  @IsDateString()
  expiryDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

import { IsString, IsInt, IsOptional, IsNumber, IsDateString, IsEnum, MaxLength, MinLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class CreateAssetDto {
  @ApiProperty({
    description: 'Asset ID (unique identifier)',
    example: 'AST001',
    minLength: 1,
    maxLength: 20,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  assetId: string;

  @ApiProperty({
    description: 'ID of the asset type',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assetTypeId: number;

  @ApiProperty({
    description: 'ID of the brand',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  brandId: number;

  @ApiProperty({
    description: 'ID of the model',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  modelId: number;

  @ApiPropertyOptional({
    description: 'Serial number of the asset',
    example: 'SN123456789',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @ApiPropertyOptional({
    description: 'Purchase date in ISO format',
    example: '2024-01-15',
  })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional({
    description: 'Purchase cost',
    example: 1500.99,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? parseFloat(value) : value))
  @IsNumber({ maxDecimalPlaces: 2 })
  purchaseCost?: number;

  @ApiPropertyOptional({
    description: 'ID of the vendor',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  vendorId?: number;

  @ApiPropertyOptional({
    description: 'Warranty start date in ISO format',
    example: '2024-01-15',
  })
  @IsOptional()
  @IsDateString()
  warrantyStartDate?: string;

  @ApiPropertyOptional({
    description: 'Warranty end date in ISO format',
    example: '2027-01-15',
  })
  @IsOptional()
  @IsDateString()
  warrantyEndDate?: string;

  @ApiPropertyOptional({
    description: 'Physical location of the asset',
    example: 'Office Floor 3, Room 301',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Condition of the asset',
    example: 'NEW',
    enum: ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'],
    default: 'NEW',
  })
  @IsOptional()
  @IsEnum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'])
  condition?: 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED' = 'NEW';

  @ApiPropertyOptional({
    description: 'Status of the asset',
    example: 'AVAILABLE',
    enum: ['AVAILABLE', 'ASSIGNED', 'IN_MAINTENANCE', 'RETIRED', 'LOST'],
    default: 'AVAILABLE',
  })
  @IsOptional()
  @IsEnum(['AVAILABLE', 'ASSIGNED', 'IN_MAINTENANCE', 'RETIRED', 'LOST'])
  status?: 'AVAILABLE' | 'ASSIGNED' | 'IN_MAINTENANCE' | 'RETIRED' | 'LOST' = 'AVAILABLE';

  @ApiPropertyOptional({
    description: 'Additional notes about the asset',
    example: 'Laptop with extended warranty',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'QR code for the asset',
    example: 'QR123456789',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  qrCode?: string;

  @ApiPropertyOptional({
    description: 'Image URL for the asset',
    example: 'https://example.com/assets/images/laptop1.jpg',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;
} 
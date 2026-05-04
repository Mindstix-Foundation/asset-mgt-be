import {
  IsString,
  IsInt,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
  IsObject,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export const ASSET_CONDITION_VALUES = [
  'NEW',
  'WORKING_CONDITION',
  'SOFTWARE_ISSUE',
  'HARDWARE_ISSUE',
  'NEEDS_REPAIR',
  'TRASH',
  'REFURBISHED',
] as const;
export type AssetConditionValue = (typeof ASSET_CONDITION_VALUES)[number];

export const ASSET_STATUS_VALUES = [
  'NON_ASSIGNED',
  'ASSIGNED',
  'IN_MAINTENANCE',
  'RETIRED',
  'LOST',
  'DONATED',
] as const;
export type AssetStatusValue = (typeof ASSET_STATUS_VALUES)[number];

export const ASSET_LOCATION_VALUES = [
  'PUNE_INVENTORY_CENTER',
  'THANE_INVENTORY_CENTER',
] as const;
export type AssetLocationValue = (typeof ASSET_LOCATION_VALUES)[number];

export class CreateAssetDto {
  @ApiPropertyOptional({
    description:
      'Asset ID (unique identifier). If not provided, will be auto-generated in format AST-XXXX',
    example: 'AST-0001',
    minLength: 7,
    maxLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(7)
  @MaxLength(8)
  assetId?: string;

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
  @Transform(({ value }) => (value ? Number.parseFloat(value) : value))
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

  @ApiProperty({
    description:
      'Physical location of the asset (must be one of allowed centers)',
    example: 'PUNE_INVENTORY_CENTER',
    enum: ASSET_LOCATION_VALUES,
  })
  @IsEnum(ASSET_LOCATION_VALUES, {
    message: `location must be one of: ${ASSET_LOCATION_VALUES.join(', ')}`,
  })
  location: AssetLocationValue;

  @ApiPropertyOptional({
    description: 'Condition of the asset',
    example: 'NEW',
    enum: ASSET_CONDITION_VALUES,
    default: 'NEW',
  })
  @IsOptional()
  @IsEnum(ASSET_CONDITION_VALUES)
  condition?: AssetConditionValue;

  @ApiPropertyOptional({
    description: 'Status of the asset',
    example: 'NON_ASSIGNED',
    enum: ASSET_STATUS_VALUES,
    default: 'NON_ASSIGNED',
  })
  @IsOptional()
  @IsEnum(ASSET_STATUS_VALUES)
  status?: AssetStatusValue;

  @ApiPropertyOptional({
    description: 'Asset specifications (JSON object with key-value pairs)',
    example: {
      processor: 'Intel i7-13700H',
      ram_gb: 16,
      operating_system: 'Windows 11',
      storage: '512GB SSD',
    },
  })
  @IsOptional()
  @IsObject()
  specifications?: Record<string, any>;

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

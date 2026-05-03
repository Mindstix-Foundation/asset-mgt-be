import {
  IsOptional,
  IsString,
  IsIn,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ASSET_CONDITION_VALUES,
  ASSET_LOCATION_VALUES,
  ASSET_STATUS_VALUES,
  type AssetConditionValue,
  type AssetLocationValue,
  type AssetStatusValue,
} from './create-asset.dto';

export class AssetQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 15,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 15;

  @ApiPropertyOptional({
    description: 'Search term for asset ID, serial number, or notes',
    example: 'AST001',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by asset type ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  assetTypeId?: number;

  @ApiPropertyOptional({
    description: 'Filter by asset type name (for custom reports)',
    example: 'Laptop',
  })
  @IsOptional()
  @IsString()
  assetType?: string;

  @ApiPropertyOptional({
    description: 'Filter by brand ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  brandId?: number;

  @ApiPropertyOptional({
    description: 'Filter by model ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  modelId?: number;

  @ApiPropertyOptional({
    description: 'Filter by vendor ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  vendorId?: number;

  @ApiPropertyOptional({
    description: 'Filter by asset status',
    example: 'NON_ASSIGNED',
    enum: ASSET_STATUS_VALUES,
  })
  @IsOptional()
  @IsEnum(ASSET_STATUS_VALUES)
  status?: AssetStatusValue;

  @ApiPropertyOptional({
    description: 'Filter by asset status (for custom reports)',
    example: 'NON_ASSIGNED',
  })
  @IsOptional()
  @IsString()
  assetStatus?: string;

  @ApiPropertyOptional({
    description: 'Filter by asset condition',
    example: 'WORKING_CONDITION',
    enum: ASSET_CONDITION_VALUES,
  })
  @IsOptional()
  @IsEnum(ASSET_CONDITION_VALUES)
  condition?: AssetConditionValue;

  @ApiPropertyOptional({
    description: 'Filter by location',
    example: 'PUNE_INVENTORY_CENTER',
    enum: ASSET_LOCATION_VALUES,
  })
  @IsOptional()
  @IsEnum(ASSET_LOCATION_VALUES)
  location?: AssetLocationValue;

  @ApiPropertyOptional({
    description: 'Specification filters JSON object (e.g. {"ram":"16GB"})',
    example: '{"ram":"16GB","processor":"M2"}',
  })
  @IsOptional()
  @IsString()
  specificationFilters?: string;

  @ApiPropertyOptional({
    description: 'Filter assets created on/after this date (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter assets created on/before this date (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'assetId',
    enum: [
      'assetId',
      'status',
      'condition',
      'purchaseDate',
      'createdAt',
      'updatedAt',
    ],
  })
  @IsOptional()
  @IsString()
  @IsIn([
    'assetId',
    'status',
    'condition',
    'purchaseDate',
    'createdAt',
    'updatedAt',
  ])
  sortBy?: string = 'assetId';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'asc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: string = 'asc';
}

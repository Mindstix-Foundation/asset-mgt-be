import {
  IsOptional,
  IsString,
  IsIn,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

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
    example: 'AVAILABLE',
    enum: ['AVAILABLE', 'ASSIGNED', 'IN_MAINTENANCE', 'RETIRED', 'LOST'],
  })
  @IsOptional()
  @IsEnum(['AVAILABLE', 'ASSIGNED', 'IN_MAINTENANCE', 'RETIRED', 'LOST'])
  status?: 'AVAILABLE' | 'ASSIGNED' | 'IN_MAINTENANCE' | 'RETIRED' | 'LOST';

  @ApiPropertyOptional({
    description: 'Filter by asset status (for custom reports)',
    example: 'AVAILABLE',
  })
  @IsOptional()
  @IsString()
  assetStatus?: string;

  @ApiPropertyOptional({
    description: 'Filter by asset condition',
    example: 'GOOD',
    enum: ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED', 'REFURBISHED'],
  })
  @IsOptional()
  @IsEnum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED', 'REFURBISHED'])
  condition?: 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED' | 'REFURBISHED';

  @ApiPropertyOptional({
    description: 'Filter by location',
    example: 'Office Floor 3',
  })
  @IsOptional()
  @IsString()
  location?: string;

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

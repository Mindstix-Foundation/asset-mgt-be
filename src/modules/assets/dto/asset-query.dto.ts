import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AssetQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

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
  @IsInt()
  @Min(1)
  assetTypeId?: number;

  @ApiPropertyOptional({
    description: 'Filter by brand ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  brandId?: number;

  @ApiPropertyOptional({
    description: 'Filter by model ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  modelId?: number;

  @ApiPropertyOptional({
    description: 'Filter by vendor ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
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
    description: 'Filter by asset condition',
    example: 'GOOD',
    enum: ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'],
  })
  @IsOptional()
  @IsEnum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'])
  condition?: 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';

  @ApiPropertyOptional({
    description: 'Filter by location',
    example: 'Office Floor 3',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'assetId',
    enum: ['assetId', 'status', 'condition', 'purchaseDate', 'createdAt', 'updatedAt'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['assetId', 'status', 'condition', 'purchaseDate', 'createdAt', 'updatedAt'])
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
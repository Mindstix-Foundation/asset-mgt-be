import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ASSET_CONDITION_VALUES,
  ASSET_STATUS_VALUES,
  type AssetConditionValue,
  type AssetStatusValue,
} from '../../assets/dto/create-asset.dto';

export class GenerateReportDto {
  @ApiProperty({
    description: 'Type of report to generate',
    example: 'assets',
    enum: [
      'assets',
      'assignments',
      'asset-categories',
      'asset-types',
      'brands',
      'models',
      'employees',
      'vendors',
    ],
  })
  @IsEnum([
    'assets',
    'assignments',
    'asset-categories',
    'asset-types',
    'brands',
    'models',
    'employees',
    'vendors',
  ])
  reportType:
    | 'assets'
    | 'assignments'
    | 'asset-categories'
    | 'asset-types'
    | 'brands'
    | 'models'
    | 'employees'
    | 'vendors';

  @ApiProperty({
    description: 'Export format',
    example: 'csv',
    enum: ['csv', 'excel', 'pdf'],
  })
  @IsEnum(['csv', 'excel', 'pdf'])
  format: 'csv' | 'excel' | 'pdf';

  @ApiPropertyOptional({
    description: 'Filter by asset type ID (for assets report)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assetTypeId?: number;

  @ApiPropertyOptional({
    description: 'Filter by brand ID (for assets report)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  brandId?: number;

  @ApiPropertyOptional({
    description: 'Filter by status (for assets report)',
    example: 'NON_ASSIGNED',
    enum: ASSET_STATUS_VALUES,
  })
  @IsOptional()
  @IsEnum(ASSET_STATUS_VALUES)
  status?: AssetStatusValue;

  @ApiPropertyOptional({
    description: 'Filter by condition (for assets report)',
    example: 'WORKING_CONDITION',
    enum: ASSET_CONDITION_VALUES,
  })
  @IsOptional()
  @IsEnum(ASSET_CONDITION_VALUES)
  condition?: AssetConditionValue;

  @ApiPropertyOptional({
    description: 'Start date for date range filtering',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for date range filtering',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Include only active assignments (for assignments report)',
    example: true,
  })
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Custom report title',
    example: 'Monthly Asset Report',
  })
  @IsOptional()
  @IsString()
  title?: string;
}

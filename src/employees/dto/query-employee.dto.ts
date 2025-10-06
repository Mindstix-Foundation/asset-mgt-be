import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { EmployeeStatus } from '@prisma/client';

export class QueryEmployeeDto {
  @ApiProperty({
    description: 'Page number',
    example: 1,
    minimum: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    description: 'Search by name, employee ID, or email',
    example: 'john',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter by status',
    enum: EmployeeStatus,
    example: EmployeeStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiProperty({
    description: 'Filter by asset assignment',
    example: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  hasAssets?: boolean;

  @ApiProperty({
    description: 'Filter by asset count range',
    enum: ['0', '1-2', '3+'],
    example: '1-2',
    required: false,
  })
  @IsOptional()
  @IsString()
  assetCountRange?: string;

  @ApiProperty({
    description: 'Sort by field',
    example: 'name',
    enum: ['name', 'employeeId', 'email', 'status', 'createdAt'],
    default: 'name',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'name';

  @ApiProperty({
    description: 'Sort order',
    example: 'asc',
    enum: ['asc', 'desc'],
    default: 'asc',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toLowerCase())
  sortOrder?: 'asc' | 'desc' = 'asc';

  @ApiProperty({
    description: 'Filter employees created on/after this date (YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiProperty({
    description: 'Filter employees created on/before this date (YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsString()
  toDate?: string;
}

export class SearchEmployeeDto {
  @ApiProperty({
    description: 'Search query',
    example: 'john doe',
    minLength: 1,
  })
  @IsString()
  q: string;

  @ApiProperty({
    description: 'Max results',
    example: 10,
    minimum: 1,
    maximum: 50,
    default: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiProperty({
    description: 'Include inactive employees',
    example: false,
    default: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeInactive?: boolean = false;
}

export type AssetEventAction = 'ASSIGNED' | 'RETURNED';

export class QueryEmployeeAssetEventsDto {
  @ApiProperty({
    description: 'Filter by action',
    enum: ['ASSIGNED', 'RETURNED'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['ASSIGNED', 'RETURNED'] as any)
  action?: AssetEventAction;

  @ApiProperty({
    description: 'Filter by asset type name (contains, case-insensitive)',
    required: false,
  })
  @IsOptional()
  @IsString()
  assetType?: string;

  @ApiProperty({
    description: 'Filter from date (YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiProperty({ description: 'Filter to date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiProperty({
    description: 'Search across asset id/brand/model',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Sort by field',
    enum: ['date', 'action', 'assetType'],
    default: 'date',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy?: 'date' | 'action' | 'assetType' = 'date';

  @ApiProperty({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toLowerCase())
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiProperty({
    description: 'Page number',
    minimum: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

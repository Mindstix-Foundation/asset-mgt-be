import { IsOptional, IsString, IsInt, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenanceStatus, MaintenanceTypeEnum } from '@prisma/client';

export class MaintenanceQueryDto {
  @ApiPropertyOptional({ description: 'Page number for pagination', example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', example: 10, default: 10 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search term for maintenance description or asset', example: 'laptop' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by maintenance status',
    enum: MaintenanceStatus,
    example: MaintenanceStatus.SCHEDULED
  })
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @ApiPropertyOptional({ description: 'Filter by asset ID', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  assetId?: number;

  @ApiPropertyOptional({ 
    description: 'Filter by maintenance type',
    enum: MaintenanceTypeEnum,
    example: MaintenanceTypeEnum.PREVENTIVE
  })
  @IsOptional()
  @IsEnum(MaintenanceTypeEnum)
  maintenanceType?: MaintenanceTypeEnum;

  // vendor filters removed

  @ApiPropertyOptional({ description: 'Filter by scheduled date from', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  scheduledDateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter by scheduled date to', example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  scheduledDateTo?: string;

  @ApiPropertyOptional({ 
    description: 'Sort by field', 
    example: 'scheduledDate',
    enum: ['scheduledDate', 'createdAt', 'status', 'maintenanceType', 'estimatedCost']
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'scheduledDate';

  @ApiPropertyOptional({ 
    description: 'Sort order', 
    example: 'desc',
    enum: ['asc', 'desc']
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
} 
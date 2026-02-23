import {
  IsOptional,
  IsString,
  IsInt,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenanceStatus, MaintenanceTypeEnum } from '@prisma/client';

export class MaintenanceExportQueryDto {
  @ApiPropertyOptional({
    description: 'Search term for maintenance description or asset',
    example: 'laptop',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by maintenance status',
    enum: MaintenanceStatus,
    example: MaintenanceStatus.SCHEDULED,
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
    example: MaintenanceTypeEnum.PREVENTIVE,
  })
  @IsOptional()
  @IsEnum(MaintenanceTypeEnum)
  maintenanceType?: MaintenanceTypeEnum;

  @ApiPropertyOptional({
    description: 'Filter by scheduled date from',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  scheduledDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by scheduled date to',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  scheduledDateTo?: string;

  // Aliases to align with frontend filters (assets/employees)
  @ApiPropertyOptional({
    description: 'Alias of scheduledDateFrom',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Alias of scheduledDateTo',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'id',
    enum: [
      'id',
      'scheduledDate',
      'createdAt',
      'status',
      'maintenanceType',
      'estimatedCost',
    ],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'id';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: string = 'desc';
}

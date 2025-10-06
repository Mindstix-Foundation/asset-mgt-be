import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsDecimal,
  IsDateString,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { MaintenanceStatus } from '@prisma/client';
import { CreateMaintenanceDto } from './create-maintenance.dto';

export class UpdateMaintenanceDto extends PartialType(CreateMaintenanceDto) {
  @ApiPropertyOptional({
    description: 'Status of maintenance',
    enum: MaintenanceStatus,
    example: MaintenanceStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @ApiPropertyOptional({
    description: 'Actual start date',
    example: '2024-12-01',
  })
  @IsOptional()
  @IsDateString()
  actualStartDate?: string;

  @ApiPropertyOptional({
    description: 'Actual completion date',
    example: '2024-12-02',
  })
  @IsOptional()
  @IsDateString()
  actualCompletionDate?: string;

  @ApiPropertyOptional({
    description: 'Actual cost of maintenance',
    example: 176,
  })
  @IsOptional()
  @IsDecimal({ decimal_digits: '2' })
  @Transform(({ value }) =>
    value ? Number.parseFloat(value).toFixed(2) : value,
  )
  actualCost?: number;

  @ApiPropertyOptional({
    description: 'Notes about completion',
    example: 'Maintenance completed successfully',
  })
  @IsOptional()
  @IsString()
  completionNotes?: string;

  @ApiPropertyOptional({
    description: 'Cancellation date',
    example: '2024-12-01',
  })
  @IsOptional()
  @IsDateString()
  cancellationDate?: string;

  @ApiPropertyOptional({
    description: 'Reason for cancellation',
    example: 'Asset no longer in use',
  })
  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @ApiPropertyOptional({
    description: 'Notes about cancellation',
    example: 'Cancelled due to asset disposal',
  })
  @IsOptional()
  @IsString()
  cancellationNotes?: string;
}

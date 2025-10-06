import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  IsDateString,
  IsDecimal,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenanceTypeEnum } from '@prisma/client';

export class CreateMaintenanceDto {
  @ApiProperty({ description: 'Asset ID for maintenance', example: 1 })
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  assetId: number;

  @ApiProperty({
    description: 'Type of maintenance',
    enum: MaintenanceTypeEnum,
    example: MaintenanceTypeEnum.PREVENTIVE,
  })
  @IsNotEmpty()
  @IsEnum(MaintenanceTypeEnum)
  maintenanceType: MaintenanceTypeEnum;

  @ApiProperty({
    description: 'Scheduled date for maintenance',
    example: '2024-12-01',
  })
  @IsNotEmpty()
  @IsDateString()
  scheduledDate: string;

  @ApiPropertyOptional({
    description: 'Frequency in days for recurring maintenance',
    example: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @Type(() => Number)
  frequencyDays?: number;

  @ApiProperty({
    description: 'Description of maintenance work',
    example: 'Regular cleaning and inspection',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Estimated cost for maintenance',
    example: 150.0,
  })
  @IsOptional()
  @IsDecimal({ decimal_digits: '2' })
  @Transform(({ value }) =>
    value ? Number.parseFloat(value).toFixed(2) : value,
  )
  estimatedCost?: number;

  // vendor removed from maintenance creation
}

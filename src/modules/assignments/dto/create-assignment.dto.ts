import {
  IsString,
  IsInt,
  IsOptional,
  IsDateString,
  IsEnum,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ASSET_CONDITION_VALUES,
  type AssetConditionValue,
} from '../../assets/dto/create-asset.dto';

export class CreateAssignmentDto {
  @ApiProperty({
    description: 'ID of the asset to be issued',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assetId: number;

  @ApiProperty({
    description: 'ID of the employee receiving the asset',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  employeeId: number;

  @ApiProperty({
    description: 'Issue date (business date only)',
    example: '2024-09-18',
  })
  @IsDateString()
  issueDate: string;

  @ApiPropertyOptional({
    description: 'Condition of the asset when issued',
    example: 'WORKING_CONDITION',
    enum: ASSET_CONDITION_VALUES,
  })
  @IsOptional()
  @IsEnum(ASSET_CONDITION_VALUES)
  issueCondition?: AssetConditionValue;

  @ApiPropertyOptional({
    description: 'Reason for issuing the asset',
    example: 'Work from home setup',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  issueReason?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the assignment',
    example: 'Employee needs laptop for remote work',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsString, IsEnum } from 'class-validator';
import {
  ASSET_CONDITION_VALUES,
  ASSET_STATUS_VALUES,
  CreateAssetDto,
  type AssetConditionValue,
  type AssetStatusValue,
} from './create-asset.dto';

export class UpdateAssetDto extends PartialType(CreateAssetDto) {
  @ApiPropertyOptional({
    description: 'Retirement date of the asset',
    example: '2024-12-31',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  retirementDate?: string;

  @ApiPropertyOptional({
    description: 'Reason for asset retirement',
    example: 'END_OF_LIFE',
    enum: [
      'END_OF_LIFE',
      'DAMAGED_BEYOND_REPAIR',
      'OBSOLETE',
      'COST_INEFFECTIVE',
      'SECURITY_CONCERNS',
      'OTHER',
    ],
  })
  @IsOptional()
  @IsEnum([
    'END_OF_LIFE',
    'DAMAGED_BEYOND_REPAIR',
    'OBSOLETE',
    'COST_INEFFECTIVE',
    'SECURITY_CONCERNS',
    'OTHER',
  ])
  retirementReason?: string;

  @ApiPropertyOptional({
    description: 'Reactivation date of the asset',
    example: '2024-12-31',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  reactivationDate?: string;

  @ApiPropertyOptional({
    description: 'Reason for asset reactivation',
    example: 'Asset repaired and ready for use',
  })
  @IsOptional()
  @IsString()
  reactivationReason?: string;

  // Override defaults from CreateAssetDto to avoid applying create-time defaults during updates
  @ApiPropertyOptional({
    description: 'Condition of the asset',
    example: 'WORKING_CONDITION',
    enum: ASSET_CONDITION_VALUES,
  })
  @IsOptional()
  @IsEnum(ASSET_CONDITION_VALUES)
  condition?: AssetConditionValue;

  @ApiPropertyOptional({
    description: 'Status of the asset',
    example: 'IN_MAINTENANCE',
    enum: ASSET_STATUS_VALUES,
  })
  @IsOptional()
  @IsEnum(ASSET_STATUS_VALUES)
  status?: AssetStatusValue;
}

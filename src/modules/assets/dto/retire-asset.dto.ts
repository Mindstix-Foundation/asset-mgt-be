import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class RetireAssetDto {
  @ApiProperty({
    description: 'Date when the asset is being retired',
    example: '2024-12-31',
    type: 'string',
    format: 'date',
  })
  @IsNotEmpty({ message: 'Retirement date is required' })
  @IsDateString({}, { message: 'Invalid retirement date format' })
  retirementDate: string;

  @ApiProperty({
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
  @IsNotEmpty({ message: 'Retirement reason is required' })
  @IsEnum(
    [
      'END_OF_LIFE',
      'DAMAGED_BEYOND_REPAIR',
      'OBSOLETE',
      'COST_INEFFECTIVE',
      'SECURITY_CONCERNS',
      'OTHER',
    ],
    { message: 'Invalid retirement reason' },
  )
  retirementReason: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the retirement',
    example:
      'Asset has reached end of life and is no longer supported by manufacturer',
  })
  @IsOptional()
  @IsString()
  retirementNotes?: string;
}

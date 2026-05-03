import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const RETURN_CONDITION_VALUES = [
  'WORKING_CONDITION',
  'SOFTWARE_ISSUE',
  'HARDWARE_ISSUE',
  'NEEDS_REPAIR',
  'TRASH',
  'REFURBISHED',
] as const;
export type ReturnConditionValue = (typeof RETURN_CONDITION_VALUES)[number];

export class ReturnAssignmentDto {
  @ApiProperty({
    description: 'Return date (business date only)',
    example: '2024-09-20',
  })
  @IsDateString()
  returnDate: string;

  @ApiProperty({
    description: 'Condition of the asset when returned',
    example: 'WORKING_CONDITION',
    enum: RETURN_CONDITION_VALUES,
  })
  @IsEnum(RETURN_CONDITION_VALUES)
  returnCondition: ReturnConditionValue;

  @ApiPropertyOptional({
    description: 'Reason for returning the asset',
    example: 'Project completed',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  returnReason?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the return',
    example: 'Asset returned in good condition with all accessories',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

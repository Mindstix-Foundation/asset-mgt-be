import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReturnAssignmentDto {
  @ApiProperty({
    description: 'Return date (business date only)',
    example: '2024-09-20',
  })
  @IsDateString()
  returnDate: string;

  @ApiProperty({
    description: 'Condition of the asset when returned',
    example: 'GOOD',
    enum: ['GOOD', 'FAIR', 'POOR', 'DAMAGED', 'REFURBISHED'],
  })
  @IsEnum(['GOOD', 'FAIR', 'POOR', 'DAMAGED', 'REFURBISHED'])
  returnCondition: 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED' | 'REFURBISHED';

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

import { IsString, IsInt, IsOptional, IsDateString, IsEnum, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

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
    example: 'GOOD',
    enum: ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'],
  })
  @IsOptional()
  @IsEnum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'])
  issueCondition?: 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';

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
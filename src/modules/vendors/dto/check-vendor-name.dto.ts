import {
  IsString,
  IsOptional,
  IsNumberString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsVendorName } from '../validators/custom-validators';
import { ToTrimmedTitleCase } from '../validators/transformers';

export class CheckVendorNameDto {
  @ApiProperty({
    description: 'Vendor name to check for availability',
    example: 'TechCorp Solutions',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2, { message: 'Vendor name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Vendor name cannot exceed 100 characters' })
  @IsVendorName({ message: 'Vendor name must be a valid business name' })
  @ToTrimmedTitleCase()
  name: string;

  @ApiProperty({
    description: 'Vendor ID to exclude from check (for edit operations)',
    example: '123',
    required: false,
  })
  @IsOptional()
  @IsNumberString({}, { message: 'excludeId must be a valid number' })
  excludeId?: string;
}

import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsEmail,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VendorStatus, VendorType } from '@prisma/client';
import {
  IsTitleCase,
  IsPanNumber,
  IsPhoneNumber,
  IsGstNumber,
  IsVendorName,
} from '../validators/custom-validators';
import {
  ToTrimmedTitleCase,
  ToUpperCase,
  ToPhoneFormat,
  ToTrimmed,
} from '../validators/transformers';

export class CreateVendorDto {
  @ApiProperty({
    description: 'Vendor name',
    example: 'Apple Store',
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
    description: 'Type of vendor',
    enum: VendorType,
    example: VendorType.SUPPLIER,
    default: VendorType.SUPPLIER,
    required: false,
  })
  @IsEnum(VendorType)
  @IsOptional()
  vendorType?: VendorType = VendorType.SUPPLIER;

  @ApiProperty({
    description: 'Contact person name',
    example: 'John Smith',
    maxLength: 100,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100, {
    message: 'Contact person name cannot exceed 100 characters',
  })
  @IsTitleCase({
    message: 'Contact person name must be in title case (e.g., "John Smith")',
  })
  @ToTrimmedTitleCase()
  contactPerson?: string;

  @ApiProperty({
    description: 'Email address',
    example: 'contact@apple.com',
    maxLength: 255,
    required: false,
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsOptional()
  @MaxLength(255, { message: 'Email address cannot exceed 255 characters' })
  @ToTrimmed()
  email?: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+1-800-275-2273',
    maxLength: 15,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(15, { message: 'Phone number cannot exceed 15 characters' })
  @IsPhoneNumber({ message: 'Please provide a valid phone number' })
  @ToPhoneFormat()
  phone?: string;

  @ApiProperty({
    description: 'Complete address',
    example: '1 Apple Park Way, Cupertino, CA 95014',
    maxLength: 500,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Address cannot exceed 500 characters' })
  @ToTrimmed()
  address?: string;

  @ApiProperty({
    description: 'Tax ID or GST number',
    example: '12ABCDE1234F1Z5',
    maxLength: 50,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Tax ID cannot exceed 50 characters' })
  @ToUpperCase()
  taxId?: string;

  @ApiProperty({
    description: 'PAN number',
    example: 'ABCDE1234F',
    maxLength: 10,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(10, { message: 'PAN number must be exactly 10 characters' })
  @IsPanNumber({
    message: 'Please provide a valid PAN number (format: ABCDE1234F)',
  })
  @ToUpperCase()
  panNumber?: string;

  @ApiProperty({
    description: 'Additional notes',
    example: 'Premium electronics supplier with excellent service record',
    maxLength: 1000,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'Notes cannot exceed 1000 characters' })
  @ToTrimmed()
  notes?: string;

  @ApiProperty({
    description: 'User ID to associate with this vendor (for vendor users)',
    example: 123,
    required: false,
  })
  @IsOptional()
  userId?: number;

  @ApiProperty({
    description: 'Vendor status',
    enum: VendorStatus,
    example: VendorStatus.ACTIVE,
    default: VendorStatus.ACTIVE,
    required: false,
  })
  @IsEnum(VendorStatus)
  @IsOptional()
  status?: VendorStatus = VendorStatus.ACTIVE;
}

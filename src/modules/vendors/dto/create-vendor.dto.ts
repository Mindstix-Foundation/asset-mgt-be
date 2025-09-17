import { IsString, IsOptional, IsBoolean, IsEnum, IsEmail, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VendorStatus, VendorType } from '@prisma/client';

export class CreateVendorDto {
  @ApiProperty({
    description: 'Vendor name',
    example: 'Apple Store',
    minLength: 2,
    maxLength: 100
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Type of vendor',
    enum: VendorType,
    example: VendorType.SUPPLIER,
    default: VendorType.SUPPLIER,
    required: false
  })
  @IsEnum(VendorType)
  @IsOptional()
  vendorType?: VendorType = VendorType.SUPPLIER;

  @ApiProperty({
    description: 'Contact person name',
    example: 'John Smith',
    maxLength: 100,
    required: false
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  contactPerson?: string;

  @ApiProperty({
    description: 'Email address',
    example: 'contact@apple.com',
    maxLength: 255,
    required: false
  })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+1-800-275-2273',
    maxLength: 15,
    required: false
  })
  @IsString()
  @IsOptional()
  @MaxLength(15)
  phone?: string;

  @ApiProperty({
    description: 'Complete address',
    example: '1 Apple Park Way, Cupertino, CA 95014',
    required: false
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    description: 'Tax ID or GST number',
    example: 'GSTIN12345',
    maxLength: 50,
    required: false
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  taxId?: string;

  @ApiProperty({
    description: 'PAN number',
    example: 'ABCDE1234F',
    maxLength: 10,
    required: false
  })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  panNumber?: string;

  @ApiProperty({
    description: 'Additional notes',
    example: 'Premium electronics supplier with excellent service record',
    required: false
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    description: 'User ID to associate with this vendor (for vendor users)',
    example: 123,
    required: false
  })
  @IsOptional()
  userId?: number;

  @ApiProperty({
    description: 'Vendor status',
    enum: VendorStatus,
    example: VendorStatus.ACTIVE,
    default: VendorStatus.ACTIVE,
    required: false
  })
  @IsEnum(VendorStatus)
  @IsOptional()
  status?: VendorStatus = VendorStatus.ACTIVE;
}

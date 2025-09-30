import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReactivateAssetDto {
  @ApiProperty({
    description: 'Date when the asset is being reactivated',
    example: '2024-12-31',
    type: 'string',
    format: 'date'
  })
  @IsNotEmpty({ message: 'Reactivation date is required' })
  @IsDateString({}, { message: 'Invalid reactivation date format' })
  reactivationDate: string;

  @ApiProperty({
    description: 'New condition of the asset after reactivation',
    example: 'REFURBISHED',
    enum: ['REFURBISHED']
  })
  @IsNotEmpty({ message: 'Asset condition is required' })
  @IsEnum(['REFURBISHED'], { message: 'Only REFURBISHED condition is allowed for reactivated assets' })
  condition: string;

  @ApiProperty({
    description: 'New status of the asset after reactivation',
    example: 'AVAILABLE',
    enum: ['AVAILABLE']
  })
  @IsNotEmpty({ message: 'Asset status is required' })
  @IsEnum(['AVAILABLE'], { message: 'Invalid asset status' })
  status: string;

  @ApiProperty({
    description: 'New location of the asset after reactivation',
    example: 'Warehouse A, Shelf B2'
  })
  @IsNotEmpty({ message: 'Asset location is required' })
  @IsString()
  location: string;

  @ApiProperty({
    description: 'Reason for asset reactivation',
    example: 'Asset repaired and ready for use'
  })
  @IsNotEmpty({ message: 'Reactivation reason is required' })
  @IsString()
  reactivationReason: string;
}

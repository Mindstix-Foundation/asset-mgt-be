import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import {
  ASSET_LOCATION_VALUES,
  type AssetLocationValue,
} from './create-asset.dto';

export class ReactivateAssetDto {
  @ApiProperty({
    description: 'Date when the asset is being reactivated',
    example: '2024-12-31',
    type: 'string',
    format: 'date',
  })
  @IsNotEmpty({ message: 'Reactivation date is required' })
  @IsDateString({}, { message: 'Invalid reactivation date format' })
  reactivationDate: string;

  @ApiProperty({
    description: 'New condition of the asset after reactivation',
    example: 'REFURBISHED',
    enum: ['REFURBISHED', 'WORKING_CONDITION'],
  })
  @IsNotEmpty({ message: 'Asset condition is required' })
  @IsEnum(['REFURBISHED', 'WORKING_CONDITION'], {
    message:
      'Only REFURBISHED or WORKING_CONDITION condition is allowed for reactivated assets',
  })
  condition: 'REFURBISHED' | 'WORKING_CONDITION';

  @ApiProperty({
    description: 'New status of the asset after reactivation',
    example: 'NON_ASSIGNED',
    enum: ['NON_ASSIGNED'],
  })
  @IsNotEmpty({ message: 'Asset status is required' })
  @IsEnum(['NON_ASSIGNED'], { message: 'Invalid asset status' })
  status: 'NON_ASSIGNED';

  @ApiProperty({
    description: 'New location of the asset after reactivation',
    example: 'PUNE_INVENTORY_CENTER',
    enum: ASSET_LOCATION_VALUES,
  })
  @IsNotEmpty({ message: 'Asset location is required' })
  @IsEnum(ASSET_LOCATION_VALUES, {
    message: `Location must be one of: ${ASSET_LOCATION_VALUES.join(', ')}`,
  })
  location: AssetLocationValue;

  @ApiProperty({
    description: 'Reason for asset reactivation',
    example: 'Asset repaired and ready for use',
  })
  @IsNotEmpty({ message: 'Reactivation reason is required' })
  @IsString()
  reactivationReason: string;
}

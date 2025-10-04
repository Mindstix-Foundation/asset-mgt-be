import { IsArray, IsInt, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BulkDeleteAssetDto {
  @ApiProperty({
    description: 'Array of asset IDs to delete',
    example: [1, 2, 3, 4, 5],
    type: [Number],
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one asset ID is required' })
  @Type(() => Number)
  @IsInt({ each: true })
  assetIds: number[];
}


import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  MaxLength,
  MinLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SpecificationTemplateInputDto } from './create-asset-type.dto';

export class UpdateAssetTypeDto {
  @ApiPropertyOptional({
    description: 'ID of the asset category',
    example: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number;

  @ApiPropertyOptional({
    description: 'Name of the asset type',
    example: 'Laptop',
    minLength: 1,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({
    description: 'Description of the asset type',
    example: 'Portable computing devices',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Specification template update for this asset type',
    type: SpecificationTemplateInputDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SpecificationTemplateInputDto)
  specificationTemplate?: SpecificationTemplateInputDto;

  @ApiPropertyOptional({
    description: 'Whether the asset type is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

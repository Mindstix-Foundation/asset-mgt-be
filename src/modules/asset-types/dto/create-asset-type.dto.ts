import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  MaxLength,
  MinLength,
  Min,
  ValidateNested,
  ArrayNotEmpty,
  IsArray,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SpecificationOptionInputDto {
  @ApiProperty({
    description: 'Option value stored with assets',
    example: 'Windows 11',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  value: string;

  @ApiPropertyOptional({
    description: 'Whether this option should be hidden for new assets',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  deprecated?: boolean = false;
}

export class SpecificationFieldInputDto {
  @ApiPropertyOptional({
    description:
      'Existing specification field key (leave empty when creating a new field)',
    example: 'processor',
    readOnly: true,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  key?: string;

  @ApiProperty({
    description: 'Display label for the field',
    example: 'Processor',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label: string;

  @ApiPropertyOptional({
    description: 'Whether the field is required',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  required?: boolean = false;

  @ApiPropertyOptional({
    description: 'Field type (defaults to dropdown for new fields)',
    example: 'dropdown',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @ApiPropertyOptional({
    description:
      'Dropdown options (required when type is dropdown; validated server-side)',
    type: [SpecificationOptionInputDto],
    example: [
      { value: 'Windows 11', deprecated: false },
      { value: 'Windows 10', deprecated: true },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecificationOptionInputDto)
  options?: SpecificationOptionInputDto[];
}

export class SpecificationTemplateInputDto {
  @ApiPropertyOptional({
    description: 'Template version (defaults to 1)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number = 1;

  @ApiProperty({
    description: 'List of specification fields',
    type: [SpecificationFieldInputDto],
  })
  @ValidateNested({ each: true })
  @Type(() => SpecificationFieldInputDto)
  @ArrayNotEmpty()
  fields: SpecificationFieldInputDto[];
}

export class CreateAssetTypeDto {
  @ApiProperty({
    description: 'ID of the asset category',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId: number;

  @ApiProperty({
    description: 'Name of the asset type',
    example: 'Laptop',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the asset type',
    example: 'Portable computing devices',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Specification template for assets of this type',
    example: {
      version: 1,
      fields: [
        {
          label: 'Operating System',
          required: true,
          options: [
            { value: 'Windows 11' },
            { value: 'Windows 10', deprecated: true },
            { value: 'macOS' },
            { value: 'Linux' },
          ],
        },
      ],
    },
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
  isActive?: boolean = true;
}

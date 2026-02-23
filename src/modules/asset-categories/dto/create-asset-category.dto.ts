import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAssetCategoryDto {
  @ApiProperty({
    description: 'Name of the asset category',
    example: 'Electronics',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the asset category',
    example: 'Electronic devices and equipment',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

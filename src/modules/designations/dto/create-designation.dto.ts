import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDesignationDto {
  @ApiProperty({
    description: 'Name of the designation',
    example: 'Software Engineer',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the designation',
    example: 'Responsible for application development',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

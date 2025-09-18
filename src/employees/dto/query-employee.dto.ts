import { IsOptional, IsString, IsEnum, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { EmployeeStatus } from '@prisma/client';

export class QueryEmployeeDto {
  @ApiProperty({
    description: 'Page number',
    example: 1,
    minimum: 1,
    default: 1,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    description: 'Search by name, employee ID, or email',
    example: 'john',
    required: false
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter by status',
    enum: EmployeeStatus,
    example: EmployeeStatus.ACTIVE,
    required: false
  })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiProperty({
    description: 'Filter by asset assignment',
    example: true,
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  hasAssets?: boolean;

  @ApiProperty({
    description: 'Filter by asset count range',
    enum: ['0', '1-2', '3+'],
    example: '1-2',
    required: false
  })
  @IsOptional()
  @IsString()
  assetCountRange?: string;

  @ApiProperty({
    description: 'Sort by field',
    example: 'name',
    enum: ['name', 'employeeId', 'email', 'status', 'createdAt'],
    default: 'name',
    required: false
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'name';

  @ApiProperty({
    description: 'Sort order',
    example: 'asc',
    enum: ['asc', 'desc'],
    default: 'asc',
    required: false
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toLowerCase())
  sortOrder?: 'asc' | 'desc' = 'asc';
}

export class SearchEmployeeDto {
  @ApiProperty({
    description: 'Search query',
    example: 'john doe',
    minLength: 1
  })
  @IsString()
  q: string;

  @ApiProperty({
    description: 'Max results',
    example: 10,
    minimum: 1,
    maximum: 50,
    default: 10,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiProperty({
    description: 'Include inactive employees',
    example: false,
    default: false,
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeInactive?: boolean = false;
} 
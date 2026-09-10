import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsString,
  IsInt,
} from 'class-validator';

export class CreateAdminDto {
  @ApiProperty({
    description: 'Employee ID to grant admin privileges',
    example: 1,
    type: Number,
  })
  @IsInt()
  @IsNotEmpty()
  employeeId: number;

  @ApiProperty({
    description: 'Roles to assign to the admin user',
    example: ['ADMIN'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roles?: string[];
}

export class UpdateAdminStatusDto {
  @ApiProperty({
    description: 'Whether the admin user is active',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;
}

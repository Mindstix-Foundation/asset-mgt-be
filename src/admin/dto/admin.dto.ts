import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsArray, MinLength, IsInt } from 'class-validator';

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
    description: 'Username for the admin account',
    example: 'admin.john',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: 'Password for the admin account',
    example: 'securePassword123',
    type: String,
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

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

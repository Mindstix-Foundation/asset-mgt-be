import {
  IsEmail,
  IsOptional,
  IsString,
  IsDateString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({
    description: '4-digit numeric employee ID (0001-9999)',
    example: '0042',
    minLength: 4,
    maxLength: 4,
  })
  @IsString()
  @Matches(/^\d{4}$/,{ message: 'Employee ID must be exactly 4 digits' })
  employeeId: string;

  @ApiProperty({
    description: 'Employee first name',
    example: 'John',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({
    description: 'Employee last name',
    example: 'Doe',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({
    description: 'Employee email address',
    example: 'john.doe@company.com',
    maxLength: 255,
  })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    description: 'Employee phone number',
    example: '+91 9876543210',
    maxLength: 15,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  phone?: string;

  @ApiProperty({
    description: 'Employee date of birth',
    example: '1990-05-15',
    format: 'date',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({
    description: 'Employee address',
    example: '123 Main Street, City, State, Country',
    maxLength: 500,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;
}

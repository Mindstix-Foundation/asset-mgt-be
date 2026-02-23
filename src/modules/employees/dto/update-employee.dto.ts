import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { CreateEmployeeDto } from './create-employee.dto';
import { EmployeeStatus } from '@prisma/client';

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @ApiProperty({
    description: 'Employee status',
    enum: EmployeeStatus,
    example: EmployeeStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;
}

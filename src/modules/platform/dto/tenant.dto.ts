import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantAdminDto {
  @ApiProperty({ example: 'acme-admin' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @ApiProperty({ example: 'admin@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin@123' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MaxLength(50)
  lastName: string;
}

export class CreateTenantDto {
  @ApiProperty({ example: 'Acme Corporation' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Whether the organization may use the platform (default true)',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description:
      'Optional first organization admin (industry-standard provisioned onboarding)',
    type: CreateTenantAdminDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateTenantAdminDto)
  admin?: CreateTenantAdminDto;
}

export class UpdateTenantStatusDto {
  @ApiProperty({
    description: 'Allow (true) or revoke (false) organization access to the platform',
  })
  @IsBoolean()
  isActive: boolean;
}

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: 'Acme Corporation' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

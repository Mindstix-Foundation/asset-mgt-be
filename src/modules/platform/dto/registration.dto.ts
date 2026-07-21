import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const trimOrUndefined = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const toTitleCaseSingleSpace = (value: string): string =>
  value
    .replaceAll(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((word) =>
      /^\d/.test(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(' ');

const trimAndTitleCase = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? toTitleCaseSingleSpace(value) : value;

const trimRequired = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Strong password: 8+ chars with upper, lower, digit, special */
export const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

export const STRONG_PASSWORD_MESSAGE =
  'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character';

export class SubmitOrganizationRegistrationDto {
  @ApiProperty({ example: 'Acme Corporation' })
  @Transform(trimAndTitleCase)
  @IsString({ message: 'Organization name is required' })
  @MinLength(2, { message: 'Organization name must be at least 2 characters' })
  @MaxLength(100, {
    message: 'Organization name must be at most 100 characters',
  })
  @Matches(/^[A-Z0-9][A-Za-z0-9.,&'\-()]*(?: [A-Z0-9][A-Za-z0-9.,&'\-()]*)*$/, {
    message:
      'Organization name must start each word with a capital letter and allow only one space between words',
  })
  organizationName: string;

  @ApiProperty({ example: 'Jane' })
  @Transform(trimAndTitleCase)
  @IsString({ message: 'First name is required' })
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  @MaxLength(50, { message: 'First name must be at most 50 characters' })
  @Matches(/^[A-Z][a-zA-Z']*(?: [A-Z][a-zA-Z']*)*$/, {
    message:
      'First name must start each word with a capital letter and allow only one space between words',
  })
  adminFirstName: string;

  @ApiProperty({ example: 'Doe' })
  @Transform(trimAndTitleCase)
  @IsString({ message: 'Last name is required' })
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  @MaxLength(50, { message: 'Last name must be at most 50 characters' })
  @Matches(/^[A-Z][a-zA-Z']*(?: [A-Z][a-zA-Z']*)*$/, {
    message:
      'Last name must start each word with a capital letter and allow only one space between words',
  })
  adminLastName: string;

  @ApiProperty({ example: 'jane@acme.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Please provide a valid work email address' })
  @MaxLength(255, { message: 'Email must be at most 255 characters' })
  adminEmail: string;

  @ApiProperty({ example: 'acme-admin' })
  @Transform(trimRequired)
  @IsString({ message: 'Username is required' })
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(50, { message: 'Username must be at most 50 characters' })
  @Matches(/^[a-zA-Z][a-zA-Z0-9._-]*$/, {
    message:
      'Username must start with a letter and may include letters, numbers, . _ -',
  })
  adminUsername: string;

  @ApiProperty({ example: 'Admin@12345' })
  @IsString({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(100, { message: 'Password must be at most 100 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/, {
    message: STRONG_PASSWORD_MESSAGE,
  })
  adminPassword: string;

  @ApiPropertyOptional({ example: '+91 9876543210' })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    // Accept 10-digit Indian mobile or +91-prefixed form; normalize to "+91 XXXXXXXXXX"
    const digitsOnly = trimmed.replace(/\D/g, '');
    const mobile =
      digitsOnly.length === 12 && digitsOnly.startsWith('91')
        ? digitsOnly.slice(2)
        : digitsOnly.length === 10
          ? digitsOnly
          : null;
    if (mobile && /^[6-9]\d{9}$/.test(mobile)) {
      return `+91 ${mobile}`;
    }
    return trimmed;
  })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Phone must be at most 20 characters' })
  @Matches(/^\+91 [6-9]\d{9}$/, {
    message:
      'Phone must be a valid Indian mobile number (10 digits starting with 6–9)',
  })
  phone?: string;

  @ApiPropertyOptional({ example: 'We manage ~200 IT assets across 2 offices.' })
  @Transform(trimOrUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Message must be at most 500 characters' })
  message?: string;
}

export class RejectOrganizationRegistrationDto {
  @ApiPropertyOptional({ example: 'Incomplete company details' })
  @Transform(trimOrUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Reason must be at most 500 characters' })
  reason?: string;
}

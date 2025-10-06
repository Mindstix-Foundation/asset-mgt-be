import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom validator for title case formatting
 * Ensures the string is in proper title case (first letter of each word capitalized)
 */
export function IsTitleCase(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isTitleCase',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }

          // Check if the string is in title case
          const titleCaseRegex = /^[A-Z][a-z]*(?:\s+[A-Z][a-z]*)*$/;
          return titleCaseRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be in title case (e.g., "John Smith", "Apple Store")`;
        },
      },
    });
  };
}

/**
 * Custom validator for PAN number format
 * Ensures PAN follows the format: 5 letters + 4 digits + 1 letter
 */
export function IsPanNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPanNumber',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }

          // PAN format: 5 letters + 4 digits + 1 letter
          const panRegex = /^[A-Z]{5}\d{4}[A-Z]$/;
          return panRegex.test(value.toUpperCase());
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid PAN number (format: ABCDE1234F)`;
        },
      },
    });
  };
}

/**
 * Custom validator for phone number format
 * Accepts various international phone number formats
 */
export function IsPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPhoneNumber',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }

          // Remove all non-digit characters except + at the beginning
          const cleaned = value.replaceAll(/[^\d+]/g, '');

          // Check if it's a valid phone number (7-15 digits, optionally starting with +)
          const phoneRegex = /^(\+?[1-9]\d{6,14})$/;
          return phoneRegex.test(cleaned);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid phone number (e.g., +1-800-275-2273, 9876543210)`;
        },
      },
    });
  };
}

/**
 * Custom validator for GST number format
 * Accepts various GST number formats
 */
export function IsGstNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isGstNumber',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }

          const upperValue = value.toUpperCase();

          // GST format: 2 digits + 5 letters + 4 digits + 1 letter + 1 letter + 1 letter + 1 letter
          const gstRegex =
            /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

          // Also accept simpler tax ID formats for international vendors
          const simpleTaxIdRegex = /^[A-Z0-9]{5,20}$/;

          return gstRegex.test(upperValue) || simpleTaxIdRegex.test(upperValue);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid GST number (format: 12ABCDE1234F1Z5) or tax ID`;
        },
      },
    });
  };
}

/**
 * Custom validator for vendor name format
 * Ensures vendor name follows proper business naming conventions
 */
export function IsVendorName(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isVendorName',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }

          // Vendor name should start with letter, contain letters, numbers, spaces, and common business suffixes
          // Using a completely new approach: separate character classes to avoid duplicates
          const vendorNameRegex =
            /^[A-Za-z][0-9\s&.,'-]*(?:Inc|LLC|Ltd|Corp|Company|Co|Pvt|Limited|Solutions|Tech|Systems|Services|Group|Global)?\.?$/i;
          return vendorNameRegex.test(value.trim());
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid vendor name (start with letter, contain only letters, numbers, spaces, and common business suffixes)`;
        },
      },
    });
  };
}

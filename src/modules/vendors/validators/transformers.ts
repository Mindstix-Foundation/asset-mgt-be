import { Transform } from 'class-transformer';

/**
 * Transform string to title case
 * Converts "john smith" to "John Smith"
 */
export function ToTitleCase() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return value;
  });
}

/**
 * Transform string to uppercase
 * Converts "abcde1234f" to "ABCDE1234F"
 */
export function ToUpperCase() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toUpperCase();
    }
    return value;
  });
}

/**
 * Transform string to trimmed and title case
 * Removes extra spaces and converts to title case
 */
export function ToTrimmedTitleCase() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .trim()
        .replaceAll(/\s+/g, ' ') // Replace multiple spaces with single space
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return value;
  });
}

/**
 * Transform string to trimmed
 * Removes leading and trailing spaces
 */
export function ToTrimmed() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  });
}

/**
 * Transform phone number to standardized format
 * Removes extra spaces and formats consistently
 */
export function ToPhoneFormat() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      // Remove all non-digit characters except + at the beginning
      const cleaned = value.replaceAll(/[^\d+]/g, '');

      // If it starts with +, keep it, otherwise format as needed
      if (cleaned.startsWith('+')) {
        return cleaned;
      }

      // For Indian numbers, add +91 if not present
      if (
        (cleaned.length === 10 && cleaned.startsWith('6')) ||
        cleaned.startsWith('7') ||
        cleaned.startsWith('8') ||
        cleaned.startsWith('9')
      ) {
        return `+91${cleaned}`;
      }

      return cleaned;
    }
    return value;
  });
}

import { Injectable } from '@nestjs/common';

@Injectable()
export class TimezoneUtil {
  /**
   * Convert UTC date to IST string format
   * @param date - Date object or ISO string
   * @returns IST formatted string (DD/MM/YYYY, HH:MM:SS)
   */
  static toISTString(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (Number.isNaN(dateObj.getTime())) {
      return date.toString();
    }

    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    return formatter.format(dateObj);
  }

  /**
   * Convert UTC date to IST date only (DD/MM/YYYY)
   * @param date - Date object or ISO string
   * @returns IST date string
   */
  static toISTDateString(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (Number.isNaN(dateObj.getTime())) {
      return date.toString();
    }

    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    return formatter.format(dateObj);
  }

  /**
   * Convert UTC date to IST time only (HH:MM:SS)
   * @param date - Date object or ISO string
   * @returns IST time string
   */
  static toISTTimeString(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (Number.isNaN(dateObj.getTime())) {
      return date.toString();
    }

    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    return formatter.format(dateObj);
  }

  /**
   * Get current IST timestamp
   * @returns Current IST timestamp string
   */
  static getCurrentIST(): string {
    return this.toISTString(new Date());
  }

  /**
   * Transform audit timestamps in an object to IST
   * @param obj - Object containing timestamp fields
   * @param timestampFields - Array of field names to convert
   * @returns Object with converted timestamps
   */
  static transformAuditTimestamps<T>(obj: T, timestampFields: string[] = ['createdAt', 'updatedAt']): T {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const result = { ...obj } as any;

    for (const field of timestampFields) {
      if (result[field]) {
        result[field] = this.toISTString(result[field]);
      }
    }

    return result;
  }

  /**
   * Transform audit timestamps in an array of objects
   * @param array - Array of objects
   * @param timestampFields - Array of field names to convert
   * @returns Array with converted timestamps
   */
  static transformAuditTimestampsArray<T>(
    array: T[], 
    timestampFields: string[] = ['createdAt', 'updatedAt']
  ): T[] {
    if (!Array.isArray(array)) {
      return array;
    }

    return array.map(item => this.transformAuditTimestamps(item, timestampFields));
  }
}

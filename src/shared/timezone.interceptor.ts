import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function toISTString(value: Date): string {
  // Return a human-readable IST string (24h) e.g., 2025-09-30, 18:45:12
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
  return formatter.format(value);
}

// Only convert audit timestamp fields to IST
const AUDIT_TIMESTAMP_FIELDS = [
  'createdAt',
  'updatedAt', 
  'changedAt',
  'assignedAt',
  'lastLogin'
];

// Business date fields that should NOT be converted
const BUSINESS_DATE_FIELDS = [
  'purchaseDate',
  'warrantyStartDate',
  'warrantyEndDate',
  'issueDate',
  'returnDate',
  'retirementDate',
  'reactivationDate',
  'scheduledDate',
  'actualStartDate',
  'actualCompletionDate',
  'cancellationDate',
  'dateOfBirth'
];

function convertAuditTimestampsToIST(data: any): any {
  if (data === null || data === undefined) return data;
  
  if (data instanceof Date) {
    return toISTString(data);
  }
  
  if (Array.isArray(data)) {
    return data.map((item) => convertAuditTimestampsToIST(item));
  }
  
  if (typeof data === 'object') {
    const result: any = Array.isArray(data) ? [] : {};
    
    for (const [key, value] of Object.entries(data)) {
      // Only convert audit timestamp fields
      if (AUDIT_TIMESTAMP_FIELDS.includes(key)) {
        if (typeof value === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
          const parsed = new Date(value);
          result[key] = isNaN(parsed.getTime()) ? value : toISTString(parsed);
        } else if (value instanceof Date) {
          result[key] = toISTString(value);
        } else {
          result[key] = value;
        }
      } else if (BUSINESS_DATE_FIELDS.includes(key)) {
        // Keep business dates as-is (don't convert)
        result[key] = value;
      } else {
        // Recursively process nested objects
        result[key] = convertAuditTimestampsToIST(value);
      }
    }
    
    return result;
  }
  
  return data;
}

@Injectable()
export class TimezoneInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => convertAuditTimestampsToIST(data)),
    );
  }
}



import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
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
const AUDIT_TIMESTAMP_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'changedAt',
  'assignedAt',
  'lastLogin',
  'issueTimestamp',
  'returnTimestamp',
]);

// Business date fields that should NOT be converted
const BUSINESS_DATE_FIELDS = new Set([
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
  'dateOfBirth',
]);

const ISO_MINUTE_RE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function isNil(value: any): boolean {
  return value === null || value === undefined;
}

function isAuditKey(key: string): boolean {
  return AUDIT_TIMESTAMP_FIELDS.has(key);
}

function isBusinessDateKey(key: string): boolean {
  return BUSINESS_DATE_FIELDS.has(key);
}

function convertAuditValue(value: any): any {
  if (value instanceof Date) return toISTString(value);
  if (typeof value === 'string' && ISO_MINUTE_RE.test(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : toISTString(parsed);
  }
  return value;
}

function convertAuditTimestampsToIST(data: any): any {
  if (isNil(data)) return data;
  if (data instanceof Date) return toISTString(data);
  if (Array.isArray(data)) return data.map(convertAuditTimestampsToIST);
  if (typeof data !== 'object') return data;

  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (isAuditKey(key)) return [key, convertAuditValue(value)];
      if (isBusinessDateKey(key)) return [key, value];
      return [key, convertAuditTimestampsToIST(value)];
    }),
  );
}

@Injectable()
export class TimezoneInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => convertAuditTimestampsToIST(data)));
  }
}

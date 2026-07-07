export interface AuditChange {
  field: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface FieldDiffResult {
  changedFields: string[];
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  changes: AuditChange[];
}

function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null && 'toString' in value) {
    const str = String(value);
    if (/^\d+(\.\d+)?$/.test(str)) return str;
  }
  return value;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  const normA = normalizeValue(a);
  const normB = normalizeValue(b);
  if (normA === normB) return true;
  if (normA === null && (normB === '' || normB === undefined)) return true;
  if (normB === null && (normA === '' || normA === undefined)) return true;
  return JSON.stringify(normA) === JSON.stringify(normB);
}

export function buildFieldDiff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
  trackedFields?: string[],
  fieldLabels: Record<string, string> = {},
): FieldDiffResult {
  const beforeObj = before ?? {};
  const afterObj = after ?? {};
  const fields =
    trackedFields ??
    Array.from(
      new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]),
    );

  const changedFields: string[] = [];
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};
  const changes: AuditChange[] = [];

  for (const field of fields) {
    const oldVal = normalizeValue(beforeObj[field]);
    const newVal = normalizeValue(afterObj[field]);
    if (!valuesEqual(oldVal, newVal)) {
      changedFields.push(field);
      oldValues[field] = oldVal;
      newValues[field] = newVal;
      changes.push({
        field,
        label: fieldLabels[field] ?? formatFieldLabel(field),
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }

  return { changedFields, oldValues, newValues, changes };
}

export function formatFieldLabel(field: string): string {
  return field
    .replaceAll('_', ' ')
    .replaceAll(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll(/\b\w/g, (c) => c.toUpperCase());
}

export function pickFields<T extends Record<string, unknown>>(
  obj: T,
  fields: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    if (field in obj) {
      result[field] = normalizeValue(obj[field]);
    }
  }
  return result;
}

export const TABLE_DISPLAY_NAMES: Record<string, string> = {
  employees: 'Employee',
  assets: 'Asset',
  vendors: 'Vendor',
  maintenance_schedules: 'Maintenance',
  asset_issues: 'Assignment',
  users: 'Admin User',
  brands: 'Brand',
  models: 'Model',
  asset_categories: 'Asset Category',
  asset_types: 'Asset Type',
};

/**
 * Merge tenant scope into a Prisma where clause.
 */
export function withTenant<T extends Record<string, unknown>>(
  tenantId: number,
  where: T = {} as T,
): T & { tenantId: number } {
  return { ...where, tenantId };
}

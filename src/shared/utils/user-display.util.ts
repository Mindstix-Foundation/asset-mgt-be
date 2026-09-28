/**
 * Shared Prisma select + display helpers for User → Employee name.
 * Username has been removed; always show the linked employee name.
 */

export const userDisplaySelect = {
  id: true,
  employee: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
      employeeId: true,
    },
  },
} as const;

type UserWithEmployee = {
  id?: number;
  employee?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    employeeId?: string | null;
  } | null;
} | null | undefined;

export function userDisplayName(
  user: UserWithEmployee,
  fallback: string = 'System',
): string {
  if (!user?.employee) return fallback;
  const name =
    `${user.employee.firstName ?? ''} ${user.employee.lastName ?? ''}`.trim();
  return name || user.employee.email || fallback;
}

/** Shape returned on nested createdBy/updatedBy/issuedBy user objects. */
export function toUserRef(user: UserWithEmployee) {
  if (!user) return null;
  return {
    id: user.id,
    name: userDisplayName(user, ''),
    email: user.employee?.email ?? undefined,
    employeeId: user.employee?.employeeId ?? undefined,
  };
}

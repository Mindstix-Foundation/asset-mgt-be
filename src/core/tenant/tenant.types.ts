export interface TenantSummary {
  id: number;
  name: string;
  isPlatform: boolean;
}

export interface AuthenticatedUser {
  id: number;
  username: string;
  employeeId: number;
  tenantId: number;
  tenant: TenantSummary;
  employee: unknown;
  roles: string[];
}

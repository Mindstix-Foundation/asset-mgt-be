import { EmployeeStatus } from '@prisma/client';

export class EmployeeResponseDto {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  status: EmployeeStatus;
  createdAt: string;
  updatedAt: string;
  assignedAssets?: AssignedAssetDto[];
  assignedAssetsCount?: number;
  isAdmin?: boolean;
}

export class AssignedAssetDto {
  assetId: string;
  assetName: string;
  serialNumber?: string;
  assignedDate: string;
  status: string;
  assetType?: string;
  brand?: string;
  model?: string;
  specifications?: Record<string, any>;
  specificationLabelMap?: Record<string, string>;
  specificationDescription?: string;
}

export class PaginationDto {
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export class EmployeeListResponseDto {
  message: string;
  data: {
    employees: EmployeeResponseDto[];
    pagination: PaginationDto;
  };
}

export class EmployeeDetailResponseDto {
  message: string;
  data: {
    employee: EmployeeResponseDto;
  };
}

export class EmployeeSearchResultDto {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  status: EmployeeStatus;
  assignedAssetsCount: number;
  phone?: string;
  matchFields: string[];
}

export class EmployeeSearchResponseDto {
  message: string;
  data: {
    searchResults: EmployeeSearchResultDto[];
    totalFound: number;
    searchQuery: string;
    searchTimeMs: number;
  };
}

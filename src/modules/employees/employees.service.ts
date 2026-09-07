import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import {
  QueryEmployeeDto,
  QueryEmployeeAssetEventsDto,
  AssetEventAction,
} from './dto/query-employee.dto';
import {
  EmployeeResponseDto,
  EmployeeListResponseDto,
  EmployeeDetailResponseDto,
  PaginationDto,
} from './dto/employee-response.dto';
import { EmployeeStatus, Prisma, AuditAction } from '@prisma/client';
import * as XLSX from 'xlsx';
import { AuditService } from '../audit/audit.service';
import { pickFields } from '../audit/audit.util';
import type { Response } from 'express';
import {
  assertExportRowLimit,
  getExportChunkSize,
  streamRowsInChunks,
  withExportLock,
  createStreamingWorkbook,
  type ColumnDef,
} from '../../shared/export/safe-excel-export';

const EMPLOYEE_AUDIT_FIELDS = [
  'employeeId',
  'firstName',
  'lastName',
  'email',
  'phone',
  'dateOfBirth',
  'address',
  'status',
];

const EMPLOYEE_FIELD_LABELS: Record<string, string> = {
  employeeId: 'Employee ID',
  firstName: 'First Name',
  lastName: 'Last Name',
  email: 'Email',
  phone: 'Phone',
  dateOfBirth: 'Date of Birth',
  address: 'Address',
  status: 'Status',
};

type AssetEventRow = {
  id: number;
  assetId: string;
  assetName: string;
  assetType: string;
  brand: string;
  model: string;
  serialNumber?: string;
  action: AssetEventAction;
  date: Date; // business date
  timestamp: Date; // audit timestamp for ordering
  condition?: string;
  reason?: string;
  notes?: string;
  performedBy: string;
};

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private pickEmployeeAuditSnapshot(employee: Record<string, unknown>) {
    const snapshot = pickFields(employee, EMPLOYEE_AUDIT_FIELDS);
    if (employee.dateOfBirth instanceof Date) {
      snapshot.dateOfBirth = employee.dateOfBirth.toISOString().split('T')[0];
    }
    return snapshot;
  }

  private employeeEntityLabel(employee: {
    firstName: string;
    lastName: string;
    employeeId: string;
  }) {
    return `${employee.firstName} ${employee.lastName} (${employee.employeeId})`;
  }

  async create(
    createEmployeeDto: CreateEmployeeDto,
    userId: number,
  ): Promise<EmployeeDetailResponseDto> {
    // Check if email already exists
    const existingEmployee = await this.prisma.employee.findUnique({
      where: { email: createEmployeeDto.email },
    });

    if (existingEmployee) {
      throw new ConflictException('Employee with this email already exists');
    }

    // Use provided 4-digit employee ID (left as-is). Ensure uniqueness.
    const employeeId = createEmployeeDto.employeeId;
    if (!/^\d{4}$/.test(employeeId)) {
      throw new BadRequestException('Employee ID must be exactly 4 digits');
    }
    const existingId = await this.prisma.employee.findUnique({
      where: { employeeId },
      select: { id: true },
    });
    if (existingId) {
      throw new ConflictException(
        'Employee with this employee ID already exists',
      );
    }

    // Convert dateOfBirth string to Date if provided
    const dateOfBirth = createEmployeeDto.dateOfBirth
      ? new Date(createEmployeeDto.dateOfBirth)
      : null;

    try {
      const employee = await this.prisma.employee.create({
        data: this.buildEmployeeCreateData(
          createEmployeeDto,
          userId,
          employeeId,
          dateOfBirth,
        ),
      });

      await this.auditService.log({
        tableName: 'employees',
        recordId: employee.id,
        action: AuditAction.INSERT,
        userId,
        entityLabel: this.employeeEntityLabel(employee),
        summary: `Created employee ${employee.firstName} ${employee.lastName}`,
        after: this.pickEmployeeAuditSnapshot(employee),
        trackedFields: EMPLOYEE_AUDIT_FIELDS,
        fieldLabels: EMPLOYEE_FIELD_LABELS,
      });

      const responseEmployee = this.mapToResponseDto(employee);
      return {
        message: 'Employee created successfully',
        data: { employee: responseEmployee },
      };
    } catch (error) {
      // Delegate unique constraint handling to reduce nesting/cyclomatic branches
      const maybeHandled = await this.handleCreateUniqueConstraintError(
        error,
        async () => {
          // On employeeId conflict retry is not applicable now because user provides ID.
          // Re-throw to surface conflict clearly.
          throw new ConflictException(
            'Employee with this employee ID already exists',
          );
        },
      );
      if (maybeHandled) {
        const responseEmployee = this.mapToResponseDto(maybeHandled);
        return {
          message: 'Employee created successfully',
          data: { employee: responseEmployee },
        };
      }
      throw error;
    }
  }

  async isEmailAvailable(
    email: string,
    excludeEmployeeId?: string,
  ): Promise<boolean> {
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const whereClause: any = { email };
    if (excludeEmployeeId) {
      whereClause.employeeId = { not: excludeEmployeeId };
    }

    const existing = await this.prisma.employee.findFirst({
      where: whereClause,
    });
    return !existing;
  }

  async isEmployeeIdAvailable(
    employeeId: string,
    excludeEmployeeDbId?: string,
  ): Promise<boolean> {
    const where: Prisma.EmployeeWhereUniqueInput = { employeeId };
    const existing = await this.prisma.employee.findUnique({ where });
    if (!existing) return true;
    if (
      excludeEmployeeDbId &&
      String(existing.id) === String(excludeEmployeeDbId)
    ) {
      return true;
    }
    return false;
  }

  async getNextAvailableEmployeeId(): Promise<string> {
    // Get the last created employee by createdAt timestamp
    // This returns the most recently added employee, not the highest ID
    const lastEmployee = await this.prisma.employee.findFirst({
      select: { employeeId: true },
      orderBy: { createdAt: 'desc' },
    });

    let nextId = 1; // Default to 0001 if no employees exist

    if (lastEmployee) {
      // Trim the employee ID since it's stored as CHAR(8) and may have trailing spaces
      const trimmedId = lastEmployee.employeeId.trim();

      // Only process if it's a valid 4-digit numeric employee ID
      if (trimmedId.length === 4 && /^\d{4}$/.test(trimmedId)) {
        const lastIdNum = Number.parseInt(trimmedId, 10);

        // Increment the last ID by 1
        // If last ID is 9999, wrap around to 0001
        // Examples: 0899 -> 0900, 9999 -> 0001
        if (!Number.isNaN(lastIdNum) && lastIdNum >= 1 && lastIdNum <= 9999) {
          nextId = lastIdNum >= 9999 ? 1 : lastIdNum + 1;
        }
      }
    }

    // Format as 4-digit string with leading zeros
    // Examples: 1 -> "0001", 900 -> "0900", 9999 -> "9999"
    return nextId.toString().padStart(4, '0');
  }

  async findAll(query: QueryEmployeeDto): Promise<EmployeeListResponseDto> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 100);
    const skip = (page - 1) * limit;
    const assetTypeId = this.normalizeAssetTypeId(query.assetTypeId);

    // Build where clause
    const where: Prisma.EmployeeWhereInput = {};

    this.applySearchFilters(where, query);
    this.applyStatusFilter(where, query);

    // Build orderBy clause
    const orderBy = this.buildEmployeeOrderBy(query.sortBy, query.sortOrder);

    // Date range by createdAt
    this.applyCreatedAtDateRange(where, query as any);

    // Apply hasAssets at DB layer so count matches
    const effectiveWhere: Prisma.EmployeeWhereInput = { ...where };
    if (query.hasAssets !== undefined) {
      effectiveWhere.assetIssues = query.hasAssets
        ? { some: { returnDate: null } }
        : { none: { returnDate: null } };
    }

    // Pre-filter by asset type at DB when not asking for "0 of this type"
    if (assetTypeId !== undefined && query.assetCountRange !== '0') {
      effectiveWhere.assetIssues = {
        some: {
          returnDate: null,
          asset: { assetTypeId },
        },
      };
    } else if (assetTypeId !== undefined && query.assetCountRange === '0') {
      effectiveWhere.assetIssues = {
        none: {
          returnDate: null,
          asset: { assetTypeId },
        },
      };
    }

    // Post-filter when counting by type or by range (pagination must match filtered set)
    const isPostFilterByCount = Boolean(
      query.assetCountRange || assetTypeId !== undefined,
    );

    // Get total count based on effective filters (includes hasAssets if provided)
    const baseTotalCount = await this.prisma.employee.count({
      where: effectiveWhere,
    });

    // Fetch page candidates
    const baseEmployees = await this.prisma.employee.findMany({
      where: effectiveWhere,
      // When post-filtering by count/type, fetch all to compute accurate totals
      skip: isPostFilterByCount ? undefined : skip,
      take: isPostFilterByCount ? undefined : limit,
      include: {
        assetIssues: {
          where: { returnDate: null },
          include: {
            asset: {
              include: { assetType: true, brand: true, model: true },
            },
          },
        },
        _count: {
          select: { assetIssues: { where: { returnDate: null } } },
        },
        user: {
          include: {
            userRoles: { where: { isActive: true }, include: { role: true } },
          },
        },
      },
      orderBy,
    });

    // Post-filter for asset type + assetCountRange (counts scoped to type when set)
    const filteredEmployees = this.filterEmployeesByAssetTypeAndCount(
      baseEmployees,
      query.assetCountRange,
      assetTypeId,
    );

    // Compute totalCount consistent with filters
    const totalCount = isPostFilterByCount
      ? filteredEmployees.length
      : baseTotalCount;

    // Apply pagination if we post-filtered
    const pagedEmployees = isPostFilterByCount
      ? filteredEmployees.slice(skip, skip + limit)
      : filteredEmployees;

    const responseEmployees = pagedEmployees.map((employee: any) => {
      const responseDto = this.mapToResponseDto(employee);
      const relevantIssues =
        assetTypeId !== undefined
          ? employee.assetIssues.filter(
              (issue: any) => Number(issue.asset?.assetTypeId) === assetTypeId,
            )
          : employee.assetIssues;
      responseDto.assignedAssetsCount = relevantIssues.length;
      responseDto.assignedAssets = relevantIssues.map((issue: any) => {
        const { specifications, specificationLabelMap } =
          this.extractAssetSpecifications(issue.asset);
        const specificationDescription = this.getAssetNotesDescription(
          issue.asset,
        );

        return {
          assetId: issue.asset.assetId,
          assetName: `${issue.asset.brand.name} ${issue.asset.model.name}`,
          serialNumber: issue.asset.serialNumber,
          assignedDate: issue.issueDate.toISOString().split('T')[0],
          status: 'ASSIGNED',
          assetType: issue.asset.assetType?.name,
          brand: issue.asset.brand?.name,
          model: issue.asset.model?.name,
          specifications: specifications || undefined,
          specificationLabelMap: specificationLabelMap || undefined,
          specificationDescription: specificationDescription || undefined,
        };
      });

      // Add admin status
      const isAdmin =
        employee.user?.userRoles?.some(
          (userRole) => userRole.role.roleName === 'ADMIN' && userRole.isActive,
        ) || false;
      responseDto.isAdmin = isAdmin;

      return responseDto;
    });

    const totalPages = Math.ceil(totalCount / limit);

    const pagination: PaginationDto = {
      totalCount,
      currentPage: page,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };

    return {
      message: 'Employees retrieved successfully',
      data: {
        employees: responseEmployees,
        pagination,
      },
    };
  }

  async findAllForDropdowns(status?: string, hasAssignedAssets?: boolean) {
    // Build where clause
    const where: Prisma.EmployeeWhereInput = {};

    // Default to ACTIVE if no status specified
    if (status) {
      where.status = status as EmployeeStatus;
    } else {
      where.status = 'ACTIVE';
    }

    // Add filter for employees with assigned assets if requested
    if (hasAssignedAssets) {
      where.assetIssues = {
        some: {
          returnDate: null, // Only active assignments (not returned)
        },
      };
    }

    // Get all employees with minimal data for dropdowns
    const employees = await this.prisma.employee.findMany({
      where,
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        status: true,
      },
      orderBy: {
        firstName: 'asc',
      },
    });

    // Transform to dropdown format
    const dropdownEmployees = employees.map((employee) => ({
      id: employee.id,
      employeeId:
        typeof employee.employeeId === 'string'
          ? employee.employeeId.trim()
          : employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      name: `${employee.firstName} ${employee.lastName}`,
      status: employee.status,
    }));

    return {
      message: 'Employees retrieved successfully',
      data: {
        employees: dropdownEmployees,
      },
    };
  }

  // Helper function to format names in proper case (e.g., "nishant bondre" -> "Nishant Bondre")
  private formatName(name: string): string {
    if (!name) return name;
    return name
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // --- Bulk upload helpers to reduce cognitive complexity ---
  private buildValidationResponse(
    message: string,
    errors: Array<{ row: number; field: string; message: string }>,
    totalRows: number,
  ) {
    return {
      message,
      data: {
        errors,
        totalRows,
        summary: {
          totalRows,
          successfulImports: 0,
          failedImports: errors.length || 1,
        },
      },
    };
  }

  private handleValidationOutcome(
    validateOnly: boolean,
    message: string,
    errors: Array<{ row: number; field: string; message: string }>,
    totalRows: number = 0,
  ) {
    if (validateOnly) {
      return this.buildValidationResponse(message, errors, totalRows);
    }
    throw new BadRequestException(message);
  }

  private validateIncomingFile(
    file: Express.Multer.File | undefined,
    validateOnly: boolean,
  ) {
    if (!file) {
      return this.handleValidationOutcome(
        validateOnly,
        'File is required',
        [{ row: 0, field: 'file', message: 'File is required' }],
        0,
      );
    }

    const allowedMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return this.handleValidationOutcome(
        validateOnly,
        'Invalid file format. Only CSV and Excel files are allowed',
        [
          {
            row: 0,
            field: 'file',
            message:
              'Invalid file format. Only CSV and Excel files are allowed',
          },
        ],
        0,
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return this.handleValidationOutcome(
        validateOnly,
        'File size too large. Maximum 10MB allowed',
        [
          {
            row: 0,
            field: 'file',
            message: 'File size too large. Maximum 10MB allowed',
          },
        ],
        0,
      );
    }
  }

  private parseRowsFromFile(
    file: Express.Multer.File,
    validateOnly: boolean,
  ): any[] | { message: string; data: any } {
    const isCsv =
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel';
    if (isCsv) {
      const csv = file.buffer.toString('utf-8');
      const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        return this.handleValidationOutcome(
          validateOnly,
          'File must contain header and at least one row',
          [
            {
              row: 0,
              field: 'file',
              message: 'File must contain header and at least one row',
            },
          ],
          0,
        );
      }

      const headers = lines[0].split(',').map((h) => h.trim());
      const headerMap: Record<string, number> = {};
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i];
        headerMap[h.toLowerCase()] = i;
      }

      const required = ['employee id', 'first name', 'last name', 'email'];
      const missing = required.filter((h) => !(h in headerMap));
      if (missing.length) {
        return this.handleValidationOutcome(
          validateOnly,
          `Missing required headers: ${missing.join(', ')}`,
          [
            {
              row: 0,
              field: 'file',
              message: `Missing required headers: ${missing.join(', ')}`,
            },
          ],
          0,
        );
      }

      const rows = lines
        .slice(1)
        .map((line) => {
          const cols = line.split(',');
          const employeeIdRaw = cols[headerMap['employee id']]?.trim();
          const firstName = cols[headerMap['first name']]?.trim();
          const lastName = cols[headerMap['last name']]?.trim();
          return {
            employeeId: employeeIdRaw,
            firstName: firstName ? this.formatName(firstName) : firstName,
            lastName: lastName ? this.formatName(lastName) : lastName,
            email: cols[headerMap['email']]?.trim(),
            phone:
              headerMap['phone'] === undefined
                ? undefined
                : cols[headerMap['phone']]?.trim(),
            dateOfBirth:
              headerMap['date of birth'] === undefined
                ? undefined
                : cols[headerMap['date of birth']]?.trim(),
            address:
              headerMap['address'] === undefined
                ? undefined
                : cols[headerMap['address']]?.trim(),
          };
        })
        .filter((r) => Boolean(r.firstName || r.lastName || r.email));
      return rows;
    }

    // Excel path
    const wb = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    return data.map((r) => {
      const readCell = (key: string): string | undefined => {
        const v = r[key];
        if (v === undefined || v === null) return undefined;
        if (typeof v === 'string') return v.trim();
        if (typeof v === 'number' || typeof v === 'boolean') return String(v);
        if (v instanceof Date) return v.toISOString();
        return undefined;
      };
      const employeeId = readCell('Employee ID');
      const firstName = readCell('First Name');
      const lastName = readCell('Last Name');
      return {
        employeeId,
        firstName: firstName ? this.formatName(firstName) : firstName,
        lastName: lastName ? this.formatName(lastName) : lastName,
        email: readCell('Email'),
        phone: readCell('Phone'),
        dateOfBirth: readCell('Date of Birth'),
        address: readCell('Address'),
      };
    });
  }

  // --- Bulk upload inner-step helpers to further reduce complexity ---
  private validateBasicRowData(rows: any[]): {
    errors: Array<{ row: number; field: string; message: string }>;
    emails: string[];
    employeeIds: string[];
  } {
    const errors: Array<{ row: number; field: string; message: string }> = [];
    const emails: string[] = [];
    const employeeIds: string[] = [];
    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx];
      const rowNum = idx + 2; // header is row 1
      const result = this.validateBasicRow(r, rowNum);
      errors.push(...result.errors);
      if (result.normalizedEmployeeId) {
        employeeIds.push(result.normalizedEmployeeId);
        r.employeeId = result.normalizedEmployeeId;
      }
      if (result.emailLower) {
        emails.push(result.emailLower);
      }
    }
    return { errors, emails, employeeIds };
  }

  private validateBasicRow(
    r: any,
    rowNum: number,
  ): {
    errors: Array<{ row: number; field: string; message: string }>;
    normalizedEmployeeId?: string;
    emailLower?: string;
  } {
    const { errors: idErrors, normalizedEmployeeId } =
      this.validateAndNormalizeEmployeeId(r, rowNum);

    const { errors: requiredErrors, emailLower } = this.validateRequiredStrings(
      r,
      rowNum,
    );

    const phoneErrors = this.validatePhoneNumber(r, rowNum);

    const { isValidFormat, errors: dobFormatErrors } =
      this.validateDateOfBirthFormat(r, rowNum);

    const ageErrors = isValidFormat
      ? this.validateAgeConstraints(r, rowNum)
      : [];

    const errors: Array<{ row: number; field: string; message: string }> = [
      ...idErrors,
      ...requiredErrors,
      ...phoneErrors,
      ...dobFormatErrors,
      ...ageErrors,
    ];

    return { errors, normalizedEmployeeId, emailLower };
  }

  private validateAndNormalizeEmployeeId(
    r: any,
    rowNum: number,
  ): {
    errors: Array<{ row: number; field: string; message: string }>;
    normalizedEmployeeId?: string;
  } {
    const errors: Array<{ row: number; field: string; message: string }> = [];
    const empId = (r.employeeId ?? '').toString().trim();
    if (!empId) {
      errors.push({
        row: rowNum,
        field: 'employeeId',
        message: 'Employee ID is required',
      });
      return { errors };
    }
    const isValid = /^\d{4}$/.test(empId) && empId !== '0000';
    if (!isValid) {
      errors.push({
        row: rowNum,
        field: 'employeeId',
        message: 'Employee ID must be 4 digits (0001-9999)',
      });
      return { errors };
    }
    return { errors, normalizedEmployeeId: empId };
  }

  private validateRequiredStrings(
    r: any,
    rowNum: number,
  ): {
    errors: Array<{ row: number; field: string; message: string }>;
    emailLower?: string;
  } {
    const errors: Array<{ row: number; field: string; message: string }> = [
      ...(r.firstName === undefined ||
      r.firstName === null ||
      r.firstName === ''
        ? [
            {
              row: rowNum,
              field: 'firstName',
              message: 'First Name is required',
            },
          ]
        : []),
      ...(r.lastName === undefined || r.lastName === null || r.lastName === ''
        ? [{ row: rowNum, field: 'lastName', message: 'Last Name is required' }]
        : []),
    ];
    if (r.email === undefined || r.email === null || r.email === '') {
      return {
        errors: errors.concat({
          row: rowNum,
          field: 'email',
          message: 'Email is required',
        }),
      };
    }
    return { errors, emailLower: String(r.email).toLowerCase() };
  }

  private validatePhoneNumber(
    r: any,
    rowNum: number,
  ): Array<{ row: number; field: string; message: string }> {
    if (r.phone && !/^\+91\s\d{10}$/.test(r.phone)) {
      return [
        {
          row: rowNum,
          field: 'phone',
          message: "Phone must be '+91 ' followed by 10 digits",
        },
      ];
    }
    return [];
  }

  private validateDateOfBirthFormat(
    r: any,
    rowNum: number,
  ): {
    isValidFormat: boolean;
    errors: Array<{ row: number; field: string; message: string }>;
  } {
    if (!r.dateOfBirth) return { isValidFormat: false, errors: [] };
    const valid = /^\d{4}-\d{2}-\d{2}$/.test(r.dateOfBirth);
    if (!valid) {
      return {
        isValidFormat: false,
        errors: [
          {
            row: rowNum,
            field: 'dateOfBirth',
            message: 'Date of Birth must be YYYY-MM-DD',
          },
        ],
      };
    }
    return { isValidFormat: true, errors: [] };
  }

  private validateAgeConstraints(
    r: any,
    rowNum: number,
  ): Array<{ row: number; field: string; message: string }> {
    try {
      const today = new Date();
      const birthDate = new Date(String(r.dateOfBirth));
      const minAgeDate = new Date();
      minAgeDate.setFullYear(today.getFullYear() - 16);
      if (birthDate > today) {
        return [
          {
            row: rowNum,
            field: 'dateOfBirth',
            message: 'Date of Birth cannot be in the future',
          },
        ];
      }
      if (birthDate > minAgeDate) {
        return [
          {
            row: rowNum,
            field: 'dateOfBirth',
            message: 'Employee must be at least 16 years old',
          },
        ];
      }
      return [];
    } catch {
      return [];
    }
  }

  private validateDuplicateEmailsInFile(
    emails: string[],
  ): Array<{ row: number; field: string; message: string }> {
    const errors: Array<{ row: number; field: string; message: string }> = [];
    const seen = new Set<string>();
    for (let i = 0; i < emails.length; i++) {
      const e = emails[i];
      if (seen.has(e)) {
        errors.push({
          row: i + 2,
          field: 'email',
          message: 'Duplicate email in file',
        });
      }
      seen.add(e);
    }
    return errors;
  }

  private validateDuplicateEmployeeIdsInFile(
    employeeIds: string[],
  ): Array<{ row: number; field: string; message: string }> {
    const errors: Array<{ row: number; field: string; message: string }> = [];
    const seen = new Map<string, number>();
    for (let i = 0; i < employeeIds.length; i++) {
      const id = employeeIds[i];
      if (seen.has(id)) {
        errors.push({
          row: i + 2,
          field: 'employeeId',
          message: 'Duplicate Employee ID in file',
        });
      } else {
        seen.set(id, i);
      }
    }
    return errors;
  }

  private async validateDuplicateEmployeeIdsInDb(
    employeeIds: string[],
    rows: any[],
  ): Promise<Array<{ row: number; field: string; message: string }>> {
    if (employeeIds.length === 0) return [];
    const existing = await this.prisma.employee.findMany({
      where: { employeeId: { in: employeeIds } },
      select: { employeeId: true },
    });
    const existingSet = new Set(existing.map((e) => e.employeeId));
    const errors: Array<{ row: number; field: string; message: string }> = [];
    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx];
      if (r.employeeId && existingSet.has(String(r.employeeId))) {
        errors.push({
          row: idx + 2,
          field: 'employeeId',
          message: 'Employee ID already exists in database',
        });
      }
    }
    return errors;
  }

  private async validateDuplicateEmailsInDb(
    emails: string[],
    rows: any[],
  ): Promise<Array<{ row: number; field: string; message: string }>> {
    if (emails.length === 0) return [];
    const existing = await this.prisma.employee.findMany({
      where: { email: { in: emails } },
      select: { email: true },
    });
    const existingEmails = new Set(existing.map((e) => e.email.toLowerCase()));
    const errors: Array<{ row: number; field: string; message: string }> = [];
    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx];
      if (r.email && existingEmails.has(String(r.email).toLowerCase())) {
        errors.push({
          row: idx + 2,
          field: 'email',
          message: 'Email already exists in database',
        });
      }
    }
    return errors;
  }

  private async insertEmployeesTransaction(
    rows: any[],
    userId: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      for (const r of rows) {
        const employeeId = r.employeeId as string;
        const dateOfBirth = r.dateOfBirth ? new Date(r.dateOfBirth) : null;
        await tx.employee.create({
          data: {
            employeeId,
            firstName: r.firstName,
            lastName: r.lastName,
            email: r.email,
            phone: r.phone || undefined,
            dateOfBirth,
            address: r.address || undefined,
            status: EmployeeStatus.ACTIVE,
            createdBy: userId,
            updatedBy: userId,
          },
        });
      }
    });
  }

  async bulkUpload(
    file: Express.Multer.File,
    userId: number,
    validateOnly: boolean = false,
  ) {
    // Validate basic file constraints
    const precheck = this.validateIncomingFile(file, validateOnly);
    if (precheck) return precheck;

    // Parse rows
    const parsed = this.parseRowsFromFile(file, validateOnly);
    if (!Array.isArray(parsed)) return parsed;
    const rows: any[] = parsed;

    // Ensure we have rows
    if (rows.length === 0) {
      return this.handleValidationOutcome(
        validateOnly,
        'File has no valid rows',
        [{ row: 0, field: 'file', message: 'File has no valid rows' }],
        0,
      );
    }

    // Basic validation + collect emails
    const { errors, emails, employeeIds } = this.validateBasicRowData(rows);
    // Check duplicates within file and against DB
    errors.push(
      ...this.validateDuplicateEmailsInFile(emails),
      ...(await this.validateDuplicateEmailsInDb(emails, rows)),
      ...this.validateDuplicateEmployeeIdsInFile(employeeIds),
      ...(await this.validateDuplicateEmployeeIdsInDb(employeeIds, rows)),
    );

    if (validateOnly) {
      return this.buildValidationResponse(
        errors.length > 0
          ? 'Validation completed with errors'
          : 'Validation successful',
        errors,
        rows.length,
      );
    }

    // For actual upload, throw error if validation fails
    if (errors.length > 0) {
      throw new BadRequestException({ message: 'Validation failed', errors });
    }

    // Transactional insert: all or none
    await this.insertEmployeesTransaction(rows, userId);

    return {
      message: 'Employees uploaded successfully',
      data: {
        imported: rows.length,
        errors: [],
        summary: {
          totalRows: rows.length,
          successfulImports: rows.length,
          failedImports: 0,
        },
      },
    };
  }

  async findOne(
    id: string,
    includeAssets: boolean = true,
  ): Promise<EmployeeDetailResponseDto> {
    // Disambiguate: 4-digit numeric strings are treated as employeeId; other all-digit strings map to DB id
    let whereClause: Prisma.EmployeeWhereUniqueInput;
    if (/^\d{4}$/.test(id)) {
      whereClause = { employeeId: id };
    } else if (/^\d+$/.test(id)) {
      whereClause = { id: Number.parseInt(id, 10) };
    } else {
      whereClause = { employeeId: id };
    }

    const employee = await this.prisma.employee.findUnique({
      where: whereClause,
      include: includeAssets
        ? {
            assetIssues: {
              include: {
                asset: {
                  include: {
                    assetType: true,
                    brand: true,
                    model: true,
                  },
                },
              },
            },
            _count: {
              select: {
                assetIssues: {
                  where: { returnDate: null },
                },
              },
            },
            user: {
              include: {
                userRoles: {
                  include: {
                    role: true,
                  },
                },
              },
            },
          }
        : {
            user: {
              include: {
                userRoles: {
                  include: {
                    role: true,
                  },
                },
              },
            },
          },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Check if employee is an admin
    const isAdmin =
      employee.user?.userRoles?.some(
        (userRole) => userRole.role.roleName === 'ADMIN' && userRole.isActive,
      ) || false;

    const responseEmployee = this.mapToResponseDto(employee);

    // Set admin status in the response
    responseEmployee.isAdmin = isAdmin;

    if (includeAssets && (employee as any).assetIssues) {
      responseEmployee.assignedAssetsCount =
        (employee as any)._count?.assetIssues || 0;
      responseEmployee.assignedAssets = (employee as any).assetIssues
        .filter((issue: any) => issue.returnDate == null) // Only active assignments
        .map((issue: any) => {
          const { specifications, specificationLabelMap } =
            this.extractAssetSpecifications(issue.asset);
          const specificationDescription = this.getAssetNotesDescription(
            issue.asset,
          );

          return {
            assetId: issue.asset.assetId,
            assetName: `${issue.asset.brand.name} ${issue.asset.model.name}`,
            serialNumber: issue.asset.serialNumber,
            assignedDate: issue.issueDate.toISOString().split('T')[0],
            status: 'ASSIGNED',
            assetType: issue.asset.assetType?.name,
            brand: issue.asset.brand?.name,
            model: issue.asset.model?.name,
            specifications: specifications || undefined,
            specificationLabelMap: specificationLabelMap || undefined,
            specificationDescription: specificationDescription || undefined,
          };
        });
    }

    return {
      message: 'Employee details retrieved successfully',
      data: {
        employee: responseEmployee,
      },
    };
  }

  async update(
    id: string,
    updateEmployeeDto: UpdateEmployeeDto,
    userId: number,
  ): Promise<EmployeeDetailResponseDto> {
    // Disambiguate: 4-digit numeric strings are treated as employeeId; other all-digit strings map to DB id
    const whereClause = this.resolveEmployeeWhereClause(id);

    const existingEmployee = await this.prisma.employee.findUnique({
      where: whereClause,
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });

    if (!existingEmployee) {
      throw new NotFoundException('Employee not found');
    }

    // Check if employee is an admin and assert constraints
    const isAdmin = this.isEmployeeAdmin(existingEmployee);
    this.assertAdminUpdateConstraints(
      existingEmployee,
      updateEmployeeDto,
      isAdmin,
    );

    // Check if email is being updated and already exists (only for non-admin employees)
    if (
      this.shouldCheckEmailUniqueness(
        isAdmin,
        updateEmployeeDto,
        existingEmployee,
      )
    ) {
      const emailExists = await this.prisma.employee.findUnique({
        where: { email: updateEmployeeDto.email },
      });

      if (emailExists) {
        throw new ConflictException('Employee with this email already exists');
      }
    }
    const updateData = this.buildUpdateEmployeeData(
      updateEmployeeDto,
      userId,
      isAdmin,
    );

    const employee = await this.prisma.employee.update({
      where: whereClause,
      data: updateData,
    });

    await this.auditService.log({
      tableName: 'employees',
      recordId: employee.id,
      action: AuditAction.UPDATE,
      userId,
      entityLabel: this.employeeEntityLabel(employee),
      summary: `Updated employee ${employee.firstName} ${employee.lastName}`,
      before: this.pickEmployeeAuditSnapshot(existingEmployee),
      after: this.pickEmployeeAuditSnapshot(employee),
      trackedFields: EMPLOYEE_AUDIT_FIELDS,
      fieldLabels: EMPLOYEE_FIELD_LABELS,
    });

    const responseEmployee = this.mapToResponseDto(employee);

    // Add admin status to response
    responseEmployee.isAdmin = isAdmin;

    return {
      message: 'Employee updated successfully',
      data: {
        employee: responseEmployee,
      },
    };
  }

  private resolveEmployeeWhereClause(
    id: string,
  ): Prisma.EmployeeWhereUniqueInput {
    if (/^\d{4}$/.test(id)) return { employeeId: id };
    if (/^\d+$/.test(id)) return { id: Number.parseInt(id, 10) };
    return { employeeId: id };
  }

  private isEmployeeAdmin(existingEmployee: any): boolean {
    return (
      existingEmployee.user?.userRoles?.some(
        (userRole: any) =>
          userRole.role.roleName === 'ADMIN' && userRole.isActive,
      ) || false
    );
  }

  private assertAdminUpdateConstraints(
    existingEmployee: any,
    updateEmployeeDto: UpdateEmployeeDto,
    isAdmin: boolean,
  ): void {
    if (isAdmin && updateEmployeeDto.email !== undefined) {
      throw new BadRequestException(
        'Cannot update email address for admin employees. Email field is read-only for admin users.',
      );
    }
    if (isAdmin && updateEmployeeDto.status === 'INACTIVE') {
      throw new BadRequestException(
        'Cannot deactivate admin employees. Admin users must remain active.',
      );
    }
  }

  private shouldCheckEmailUniqueness(
    isAdmin: boolean,
    updateEmployeeDto: UpdateEmployeeDto,
    existingEmployee: any,
  ): boolean {
    return (
      !isAdmin &&
      Boolean(updateEmployeeDto.email) &&
      updateEmployeeDto.email !== existingEmployee.email
    );
  }

  private buildUpdateEmployeeData(
    updateEmployeeDto: UpdateEmployeeDto,
    userId: number,
    isAdmin: boolean,
  ): any {
    const dateOfBirth = updateEmployeeDto.dateOfBirth
      ? new Date(updateEmployeeDto.dateOfBirth)
      : undefined;

    const updateData: any = {
      ...updateEmployeeDto,
      dateOfBirth,
      updatedBy: userId,
    };

    if (isAdmin) {
      delete updateData.email;
    }

    if (updateEmployeeDto.firstName) {
      updateData.firstName = this.formatName(updateEmployeeDto.firstName);
    }
    if (updateEmployeeDto.lastName) {
      updateData.lastName = this.formatName(updateEmployeeDto.lastName);
    }
    return updateData;
  }

  async remove(
    id: string,
    userId: number,
    reassignAssetsTo?: string,
  ): Promise<EmployeeDetailResponseDto> {
    // Disambiguate: 4-digit numeric strings are treated as employeeId; other all-digit strings map to DB id
    let whereClause: Prisma.EmployeeWhereUniqueInput;
    if (/^\d{4}$/.test(id)) {
      whereClause = { employeeId: id };
    } else if (/^\d+$/.test(id)) {
      whereClause = { id: Number.parseInt(id, 10) };
    } else {
      whereClause = { employeeId: id };
    }

    const employee = await this.prisma.employee.findUnique({
      where: whereClause,
      include: {
        assetIssues: true, // Get all asset issues (current and past)
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Check if employee is an admin
    const adminRole = await this.prisma.role.findFirst({
      where: { roleName: 'ADMIN' },
    });

    if (adminRole) {
      const adminUser = await this.prisma.user.findFirst({
        where: {
          employeeId: employee.id,
          userRoles: {
            some: {
              roleId: adminRole.id,
              isActive: true,
            },
          },
        },
      });

      if (adminUser) {
        throw new BadRequestException(
          'Cannot delete an admin employee. Please remove admin privileges first.',
        );
      }
    }

    // Check if employee has any asset history (current or past)
    if (employee.assetIssues.length > 0) {
      throw new BadRequestException(
        'Cannot delete employee with asset history. Only employees without any asset assignments can be permanently deleted.',
      );
    }

    const beforeSnapshot = this.pickEmployeeAuditSnapshot(employee);

    // Hard delete - permanently remove from database
    const deletedEmployee = await this.prisma.employee.delete({
      where: whereClause,
    });

    await this.auditService.log({
      tableName: 'employees',
      recordId: deletedEmployee.id,
      action: AuditAction.DELETE,
      userId,
      entityLabel: this.employeeEntityLabel(deletedEmployee),
      summary: `Deleted employee ${deletedEmployee.firstName} ${deletedEmployee.lastName}`,
      before: beforeSnapshot,
      trackedFields: EMPLOYEE_AUDIT_FIELDS,
      fieldLabels: EMPLOYEE_FIELD_LABELS,
    });

    const responseEmployee = this.mapToResponseDto(deletedEmployee);

    return {
      message: 'Employee permanently deleted successfully',
      data: {
        employee: {
          ...responseEmployee,
          assignedAssetsCount: 0,
        },
      },
    };
  }

  private async generateEmployeeId(): Promise<string> {
    // Use raw SQL to compute the max numeric suffix from existing employee_id values
    // Filter to only EMP IDs to avoid system IDs like 'admin123' skewing the sequence
    const result = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT COALESCE(MAX(CAST(regexp_replace(employee_id, '\\D', '', 'g') AS INTEGER)), 0) AS max_num 
       FROM employees 
       WHERE employee_id ~ '^EMP-?\\d+$' AND regexp_replace(employee_id, '\\D', '', 'g') != ''`,
    );
    const maxNum: number =
      Array.isArray(result) && result.length > 0
        ? Number(result[0]?.max_num ?? 0)
        : 0;
    const next = maxNum + 1;
    // Always 4 digits like EMP-0001
    return `EMP-${next.toString().padStart(4, '0')}`;
  }

  async getAssetHistory(employeeId: string): Promise<{
    message: string;
    data: {
      assetHistory: Array<{
        id: number;
        assetId: string;
        assetName: string;
        assetType: string;
        brand: string;
        model: string;
        action: 'RETURNED';
        issueDate: string;
        returnDate: string;
        issueCondition: string;
        returnCondition?: string;
        issueReason?: string;
        returnReason?: string;
        notes?: string;
        issuedBy: string;
        returnedBy?: string;
        duration: number; // in days
      }>;
    };
  }> {
    // Check if employeeId is numeric (database ID) or string (employeeId)
    const isNumericId = /^\d+$/.test(employeeId);
    const whereClause = isNumericId
      ? { id: Number.parseInt(employeeId, 10) }
      : { employeeId };

    const employee = await this.prisma.employee.findUnique({
      where: whereClause,
      select: { id: true, employeeId: true, firstName: true, lastName: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Get only completed asset assignments (assigned and returned) for this employee
    const assetIssues = await this.prisma.assetIssue.findMany({
      where: {
        employeeId: employee.id,
        returnDate: { not: null }, // Only show completed assignments (returned assets)
      },
      include: {
        asset: {
          include: {
            assetType: { select: { name: true } },
            brand: { select: { name: true } },
            model: { select: { name: true } },
          },
        },
        issuedByUser: { select: { username: true } },
        updatedByUser: { select: { username: true } },
      },
      orderBy: { issueDate: 'desc' },
    });

    const assetHistory = assetIssues.map((issue) => {
      // Since we only fetch returned assets, duration is always calculated from return date
      const duration = Math.ceil(
        (new Date(issue.returnDate!).getTime() -
          new Date(issue.issueDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      return {
        id: issue.id,
        assetId: issue.asset.assetId,
        assetName: `${issue.asset.brand.name} ${issue.asset.model.name}`,
        assetType: issue.asset.assetType.name,
        brand: issue.asset.brand.name,
        model: issue.asset.model.name,
        action: 'RETURNED' as const, // All items in history are completed (returned)
        issueDate: issue.issueDate.toISOString(),
        returnDate: issue.returnDate!.toISOString(), // We know returnDate exists since we filtered for it
        issueCondition: issue.issueCondition || 'UNKNOWN',
        returnCondition: issue.returnCondition || undefined,
        issueReason: issue.issueReason || undefined,
        returnReason: issue.returnReason || undefined,
        notes: issue.notes || undefined,
        issuedBy: issue.issuedByUser.username,
        returnedBy: issue.updatedByUser?.username,
        duration,
      };
    });

    return {
      message: 'Asset history retrieved successfully',
      data: { assetHistory },
    };
  }

  async getAssetEvents(
    employeeId: string,
    query: QueryEmployeeAssetEventsDto,
  ): Promise<{
    message: string;
    data: {
      assetEvents: Array<{
        id: number; // assetEvent id
        assetId: string;
        assetName: string;
        assetType: string;
        brand: string;
        model: string;
        action: AssetEventAction;
        date: string; // business date (YYYY-MM-DD)
        timestamp: string; // audit timestamp (ISO)
        condition?: string;
        reason?: string;
        notes?: string;
        performedBy: string;
      }>;
      pagination: {
        totalCount: number;
        currentPage: number;
        totalPages: number;
        hasNext: boolean;
        hasPrevious: boolean;
      };
    };
  }> {
    // Check if employeeId is numeric (database ID) or string (employeeId)
    const isNumericId = /^\d+$/.test(employeeId);
    const whereClause = isNumericId
      ? { id: Number.parseInt(employeeId, 10) }
      : { employeeId };

    const employee = await this.prisma.employee.findUnique({
      where: whereClause,
      select: { id: true, employeeId: true },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);

    // Build base where clause for AssetEvents
    // We need to find events where this employee is mentioned in metadata
    const where: any = {
      OR: [
        // Events where employee is mentioned by database ID
        {
          eventType: { in: ['ASSET_ISSUED', 'ASSET_COLLECTED'] },
          metadata: {
            path: ['employeeId'],
            equals: employee.employeeId,
          },
        },
      ],
    };

    // Fetch asset events from AssetEvent table
    const events = await this.prisma.assetEvent.findMany({
      where,
      include: {
        asset: {
          select: {
            assetId: true,
            serialNumber: true,
            specifications: true,
            assetType: {
              select: {
                name: true,
                specificationTemplate: true,
              },
            },
            brand: { select: { name: true } },
            model: {
              select: {
                name: true,
                specifications: true,
              },
            },
          },
        },
        performedByUser: {
          select: {
            username: true,
            employee: {
              select: {
                firstName: true,
                lastName: true,
                employeeId: true,
              },
            },
          },
        },
      },
      orderBy: { eventDate: 'desc' },
    });

    // Transform events, apply filters and sorting via helpers
    // Map events to include both transformed row and original event for specifications extraction
    const eventsWithRows = events
      .map((event) => {
        const row = this.transformAssetEvent(event);
        return row ? { row, event } : null;
      })
      .filter(
        (item): item is { row: AssetEventRow; event: any } => item !== null,
      );

    const transformed: AssetEventRow[] = eventsWithRows.map((item) => item.row);
    const filtered = this.applyAssetEventFilters(transformed, query);
    this.sortAssetEvents(
      filtered,
      query.sortBy ?? 'date',
      (query.sortOrder ?? 'desc') === 'asc' ? 1 : -1,
    );

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const pageSafe = Math.min(Math.max(page, 1), totalPages);
    const start = (pageSafe - 1) * limit;
    const end = start + limit;
    const pageItems = filtered.slice(start, end).map((e) => {
      // Find the original event for this row to extract specifications
      const originalEvent = eventsWithRows.find(
        (item) => item.row.id === e.id,
      )?.event;
      const { specifications, specificationLabelMap } = originalEvent
        ? this.extractAssetSpecifications(originalEvent.asset)
        : { specifications: null, specificationLabelMap: null };

      return {
        id: e.id,
        assetId: e.assetId,
        assetName: e.assetName,
        assetType: e.assetType,
        brand: e.brand,
        model: e.model,
        serialNumber: e.serialNumber,
        action: e.action,
        date: e.date.toISOString().split('T')[0],
        timestamp: e.timestamp.toISOString(),
        condition: e.condition,
        reason: e.reason,
        notes: e.notes,
        performedBy: e.performedBy,
        specifications: specifications || undefined,
        specificationLabelMap: specificationLabelMap || undefined,
      };
    });

    return {
      message: 'Asset events retrieved successfully',
      data: {
        assetEvents: pageItems,
        pagination: {
          totalCount,
          currentPage: pageSafe,
          totalPages,
          hasNext: pageSafe < totalPages,
          hasPrevious: pageSafe > 1,
        },
      },
    };
  }

  private getPerformedByName(event: any): string {
    const first = event.performedByUser.employee?.firstName || '';
    const last = event.performedByUser.employee?.lastName || '';
    const full = `${first} ${last}`.trim();
    return (
      full ||
      event.performedByUser.employee?.employeeId ||
      event.performedByUser.username
    );
  }

  private transformAssetEvent(event: any): AssetEventRow | null {
    const performedByName = this.getPerformedByName(event);
    const metadata = event.metadata;
    if (event.eventType === 'ASSET_ISSUED') {
      return {
        id: event.id,
        assetId: event.asset.assetId,
        assetName: `${event.asset.brand.name} ${event.asset.model.name}`,
        assetType: event.asset.assetType.name,
        brand: event.asset.brand.name,
        model: event.asset.model.name,
        serialNumber: event.asset.serialNumber || undefined,
        action: 'ASSIGNED',
        date: metadata?.issueDate
          ? new Date(metadata.issueDate)
          : new Date(event.eventDate),
        timestamp: new Date(event.eventDate),
        condition: metadata?.issueCondition || undefined,
        reason: metadata?.issueReason || undefined,
        notes: metadata?.notes || undefined,
        performedBy: performedByName,
      };
    }
    if (event.eventType === 'ASSET_COLLECTED') {
      return {
        id: event.id,
        assetId: event.asset.assetId,
        assetName: `${event.asset.brand.name} ${event.asset.model.name}`,
        assetType: event.asset.assetType.name,
        brand: event.asset.brand.name,
        model: event.asset.model.name,
        serialNumber: event.asset.serialNumber || undefined,
        action: 'RETURNED',
        date: metadata?.returnDate
          ? new Date(metadata.returnDate)
          : new Date(event.eventDate),
        timestamp: new Date(event.eventDate),
        condition: metadata?.returnCondition || undefined,
        reason: metadata?.returnReason || undefined,
        notes: metadata?.notes || undefined,
        performedBy: performedByName,
      };
    }
    return null;
  }

  private applyAssetEventFilters(
    rows: AssetEventRow[],
    query: QueryEmployeeAssetEventsDto,
  ): AssetEventRow[] {
    let filtered = rows;
    if (query.action) {
      filtered = filtered.filter((e) => e.action === query.action);
    }
    if (query.assetType) {
      const q = query.assetType.toLowerCase();
      filtered = filtered.filter((e) => e.assetType.toLowerCase().includes(q));
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.assetId.toLowerCase().includes(q) ||
          e.assetName.toLowerCase().includes(q) ||
          e.brand.toLowerCase().includes(q) ||
          e.model.toLowerCase().includes(q),
      );
    }
    if (query.dateFrom) {
      const from = new Date(query.dateFrom);
      filtered = filtered.filter((e) => e.date >= from);
    }
    if (query.dateTo) {
      const to = new Date(query.dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter((e) => e.date <= to);
    }
    return filtered;
  }

  private sortAssetEvents(
    rows: AssetEventRow[],
    sortBy: string,
    sortOrder: 1 | -1,
  ): void {
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'action') cmp = a.action.localeCompare(b.action);
      else if (sortBy === 'assetType')
        cmp = a.assetType.localeCompare(b.assetType);
      else cmp = a.timestamp.getTime() - b.timestamp.getTime();
      return cmp * sortOrder;
    });
  }
  private mapToResponseDto(employee: any): EmployeeResponseDto {
    return {
      id: employee.id.toString(),
      employeeId:
        typeof employee.employeeId === 'string'
          ? employee.employeeId.trim()
          : employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      dateOfBirth: employee.dateOfBirth
        ? employee.dateOfBirth.toISOString().split('T')[0]
        : undefined,
      address: employee.address,
      status: employee.status,
      createdAt: employee.createdAt.toISOString(),
      updatedAt: employee.updatedAt.toISOString(),
      isAdmin: false, // Will be set separately after mapping
    };
  }

  // --- Small helpers to reduce cognitive complexity in findAll ---
  private buildEmployeeSearchConditions(
    search: string,
  ): Prisma.EmployeeWhereInput[] {
    const normalized = search.trim().replace(/\s+/g, ' ');
    if (!normalized) return [];

    const conditions: Prisma.EmployeeWhereInput[] = [
      { firstName: { contains: normalized, mode: 'insensitive' } },
      { lastName: { contains: normalized, mode: 'insensitive' } },
      { employeeId: { contains: normalized, mode: 'insensitive' } },
      { email: { contains: normalized, mode: 'insensitive' } },
    ];

    const parts = normalized.split(' ').filter((part) => part.length > 0);
    if (parts.length >= 2) {
      const first = parts[0];
      const last = parts.slice(1).join(' ');

      conditions.push({
        AND: [
          { firstName: { contains: first, mode: 'insensitive' } },
          { lastName: { contains: last, mode: 'insensitive' } },
        ],
      });

      if (parts.length === 2) {
        conditions.push({
          AND: [
            { firstName: { contains: last, mode: 'insensitive' } },
            { lastName: { contains: first, mode: 'insensitive' } },
          ],
        });
      }
    }

    return conditions;
  }

  private applySearchFilters(
    where: Prisma.EmployeeWhereInput,
    query: QueryEmployeeDto,
  ): void {
    if (!query.search?.trim()) return;
    const conditions = this.buildEmployeeSearchConditions(query.search);
    if (conditions.length > 0) {
      where.OR = conditions;
    }
  }

  private applyStatusFilter(
    where: Prisma.EmployeeWhereInput,
    query: QueryEmployeeDto,
  ): void {
    if (query.status) {
      where.status = query.status;
    }
  }

  private buildEmployeeOrderBy(
    sortBy: string | undefined,
    sortOrder: 'asc' | 'desc' = 'asc',
  ): Prisma.EmployeeOrderByWithRelationInput {
    const orderBy: Prisma.EmployeeOrderByWithRelationInput = {};
    const order = sortOrder;
    switch (sortBy) {
      case 'name':
        orderBy.firstName = order;
        break;
      case 'employeeId':
        orderBy.employeeId = order;
        break;
      case 'email':
        orderBy.email = order;
        break;
      case 'status':
        orderBy.status = order;
        break;
      case 'createdAt':
        orderBy.createdAt = order;
        break;
      default:
        orderBy.firstName = 'asc';
    }
    return orderBy;
  }

  private applyCreatedAtDateRange(
    where: Prisma.EmployeeWhereInput,
    query: any,
  ): void {
    if (!query?.fromDate && !query?.toDate) return;
    (where as any).createdAt = {} as any;
    if (query.fromDate) {
      (where as any).createdAt.gte = new Date(query.fromDate);
    }
    if (query.toDate) {
      const end = new Date(query.toDate);
      end.setHours(23, 59, 59, 999);
      (where as any).createdAt.lte = end;
    }
  }

  private matchesAssetCountRange(
    assetCount: number,
    assetCountRange: string,
  ): boolean {
    if (assetCountRange === '0') return assetCount === 0;
    if (assetCountRange === '5+') return assetCount >= 5;
    if (['1', '2', '3', '4', '5'].includes(assetCountRange)) {
      return assetCount === Number(assetCountRange);
    }
    // Legacy ranges kept for backward compatibility
    if (assetCountRange === '1-2') return assetCount >= 1 && assetCount <= 2;
    if (assetCountRange === '3+') return assetCount >= 3;
    return true;
  }

  private normalizeAssetTypeId(
    assetTypeId?: number | string | null,
  ): number | undefined {
    if (assetTypeId === undefined || assetTypeId === null || assetTypeId === '') {
      return undefined;
    }
    const parsed = Number(assetTypeId);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private getRelevantAssetCount(
    employee: {
      assetIssues?: Array<{
        asset?: { assetTypeId?: number | null } | null;
      }>;
      _count?: { assetIssues: number };
    },
    assetTypeId?: number,
  ): number {
    if (assetTypeId !== undefined) {
      return (employee.assetIssues || []).filter(
        (issue) => Number(issue.asset?.assetTypeId) === assetTypeId,
      ).length;
    }
    if (employee._count?.assetIssues !== undefined) {
      return employee._count.assetIssues;
    }
    return employee.assetIssues?.length || 0;
  }

  private filterEmployeesByAssetTypeAndCount<
    T extends {
      assetIssues?: Array<{
        asset?: { assetTypeId?: number | null } | null;
      }>;
      _count?: { assetIssues: number };
    },
  >(
    employees: T[],
    assetCountRange?: string,
    assetTypeId?: number | string,
  ): T[] {
    const normalizedTypeId = this.normalizeAssetTypeId(assetTypeId);
    if (!assetCountRange && normalizedTypeId === undefined) return employees;
    return employees.filter((emp) => {
      const count = this.getRelevantAssetCount(emp, normalizedTypeId);
      if (assetCountRange) {
        return this.matchesAssetCountRange(count, assetCountRange);
      }
      // Asset type alone: only employees who have at least one of that type
      return count > 0;
    });
  }

  private filterEmployeesByAssetCountRange<
    T extends { _count: { assetIssues: number } },
  >(employees: T[], assetCountRange?: string): T[] {
    return this.filterEmployeesByAssetTypeAndCount(employees, assetCountRange);
  }

  private extractAssetSpecifications(asset: any): {
    specifications: Record<string, any> | null;
    specificationLabelMap: Record<string, string> | null;
  } {
    if (!asset) {
      return {
        specifications: null,
        specificationLabelMap: null,
      };
    }

    const assetSpecs = this.parseSpecificationsPayload(asset.specifications);
    const modelSpecs = this.parseSpecificationsPayload(
      asset.model?.specifications,
    );
    const specifications = assetSpecs || modelSpecs || null;
    const specificationLabelMap = this.buildSpecificationLabelMap(
      asset.assetType,
    );

    return { specifications, specificationLabelMap };
  }

  private parseSpecificationsPayload(
    input: unknown,
  ): Record<string, any> | null {
    if (input === null || input === undefined) {
      return null;
    }

    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed) {
        return null;
      }
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return this.stripDescriptionField(parsed as Record<string, any>);
        }
      } catch (error) {
        console.warn('Failed to parse specifications JSON:', error);
        return null;
      }
      return null;
    }

    if (typeof input === 'object' && !Array.isArray(input)) {
      return this.stripDescriptionField(input as Record<string, any>);
    }

    return null;
  }

  private stripDescriptionField(
    payload: Record<string, any>,
  ): Record<string, any> | null {
    const specs: Record<string, any> = { ...payload };
    for (const key of Object.keys(specs)) {
      if (key.toLowerCase() === 'description') {
        delete specs[key];
      }
    }
    return Object.keys(specs).length > 0 ? specs : null;
  }

  private getAssetNotesDescription(asset: any): string | null {
    if (!asset?.notes) return null;
    const trimmed = String(asset.notes).trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private buildSpecificationLabelMap(
    assetType: any,
  ): Record<string, string> | null {
    if (!assetType?.specificationTemplate) {
      return null;
    }

    let template = assetType.specificationTemplate;
    if (typeof template === 'string') {
      try {
        template = JSON.parse(template);
      } catch (error) {
        console.warn('Failed to parse specification template JSON:', error);
        return null;
      }
    }

    const fields = Array.isArray(template?.fields) ? template.fields : [];
    if (fields.length === 0) {
      return null;
    }

    const labelMap: Record<string, string> = {};
    for (const field of fields) {
      if (field?.key) {
        labelMap[field.key] =
          field.label || this.formatSpecificationLabel(field.key);
      }
    }

    return Object.keys(labelMap).length > 0 ? labelMap : null;
  }

  private formatSpecificationLabel(key: string): string {
    return key
      .replaceAll(/[_\s]+/g, ' ')
      .replaceAll(/([a-z0-9])([A-Z])/g, '$1 $2')
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private buildEmployeeCreateData(
    createEmployeeDto: CreateEmployeeDto,
    userId: number,
    employeeId: string,
    dateOfBirth: Date | null,
  ) {
    return {
      employeeId,
      firstName: this.formatName(createEmployeeDto.firstName),
      lastName: this.formatName(createEmployeeDto.lastName),
      email: createEmployeeDto.email,
      phone: createEmployeeDto.phone,
      dateOfBirth,
      address: createEmployeeDto.address,
      status: EmployeeStatus.ACTIVE,
      createdBy: userId,
      updatedBy: userId,
    } as const;
  }

  private async handleCreateUniqueConstraintError(
    error: unknown,
    retryWithNewEmployeeId: () => Promise<unknown>,
  ): Promise<unknown> {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return null;
    }
    if (error.code !== 'P2002') {
      return null;
    }
    const target = (error as any).meta?.target as string[] | undefined;
    const targetStr = String(target);
    if (target?.includes('email') || targetStr.includes('email')) {
      throw new ConflictException('Employee with this email already exists');
    }
    if (
      target?.includes('employee_id') ||
      targetStr.includes('employee_id') ||
      targetStr.includes('employeeId')
    ) {
      try {
        const employee = await retryWithNewEmployeeId();
        return employee;
      } catch (err) {
        throw new ConflictException(
          'Employee with this employee ID already exists',
          { cause: err as Error },
        );
      }
    }
    // Default precise message when meta.target is missing or unknown
    throw new ConflictException('Employee with this email already exists');
  }

  // Export employees to Excel with asset details (streaming, capped)
  async exportEmployeesToExcel(queryDto: QueryEmployeeDto, res: Response) {
    const {
      search,
      status,
      hasAssets,
      assetCountRange,
      sortBy = 'firstName',
      sortOrder = 'asc',
    } = queryDto;
    const assetTypeId = this.normalizeAssetTypeId(queryDto.assetTypeId);

    const where: Prisma.EmployeeWhereInput = {};

    if (search) {
      const conditions = this.buildEmployeeSearchConditions(search);
      if (conditions.length > 0) {
        where.OR = conditions;
      }
    }

    if (status) {
      where.status = status;
    }

    // Apply createdAt date range (same as findAll)
    this.applyCreatedAtDateRange(where, queryDto as any);

    if (hasAssets !== undefined) {
      if (hasAssets) {
        where.assetIssues = { some: { returnDate: null } };
      } else {
        where.assetIssues = { none: { returnDate: null } };
      }
    }

    if (assetTypeId !== undefined && assetCountRange !== '0') {
      where.assetIssues = {
        some: {
          returnDate: null,
          asset: { assetTypeId },
        },
      };
    } else if (assetTypeId !== undefined && assetCountRange === '0') {
      where.assetIssues = {
        none: {
          returnDate: null,
          asset: { assetTypeId },
        },
      };
    }

    const orderBy: any = {};
    switch (sortBy) {
      case 'name':
        orderBy.firstName = sortOrder;
        break;
      case 'employeeId':
        orderBy.employeeId = sortOrder;
        break;
      case 'email':
        orderBy.email = sortOrder;
        break;
      case 'status':
        orderBy.status = sortOrder;
        break;
      case 'createdAt':
        orderBy.createdAt = sortOrder;
        break;
      default:
        orderBy.firstName = 'asc';
    }

    const include = {
      createdByUser: {
        select: {
          id: true,
          username: true,
          employee: { select: { firstName: true, lastName: true } },
        },
      },
      updatedByUser: {
        select: {
          id: true,
          username: true,
          employee: { select: { firstName: true, lastName: true } },
        },
      },
      assetIssues: {
        where: { returnDate: null },
        include: {
          asset: {
            include: {
              assetType: { select: { name: true } },
              brand: { select: { name: true } },
              model: { select: { name: true } },
            },
          },
        },
      },
    } as const;

    const columns: ColumnDef[] = [
      { header: 'Employee ID', key: 'employeeId', width: 12 },
      { header: 'First Name', key: 'firstName', width: 15 },
      { header: 'Last Name', key: 'lastName', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Date of Birth', key: 'dateOfBirth', width: 12 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Number of Assets', key: 'assetCount', width: 15 },
      { header: 'Asset Details', key: 'assetDetails', width: 50 },
      { header: 'Created By', key: 'createdBy', width: 15 },
      { header: 'Updated By', key: 'updatedBy', width: 15 },
      { header: 'Created At', key: 'createdAt', width: 12 },
      { header: 'Updated At', key: 'updatedAt', width: 12 },
    ];

    const filename = `employees_export_${new Date().toISOString().split('T')[0]}.xlsx`;

    const employeeMatchesFilters = (employee: any): boolean => {
      const count = this.getRelevantAssetCount(employee, assetTypeId);
      if (assetCountRange) {
        return this.matchesAssetCountRange(count, assetCountRange);
      }
      if (assetTypeId !== undefined) {
        return count > 0;
      }
      return true;
    };

    const mapEmployeeRow = (employee: any) => {
      const relevantIssues =
        assetTypeId !== undefined
          ? employee.assetIssues.filter(
              (issue: any) => Number(issue.asset?.assetTypeId) === assetTypeId,
            )
          : employee.assetIssues;

      const assetDetails = relevantIssues
        .map(
          (issue: any) =>
            `${issue.asset.brand.name} ${issue.asset.model.name} (${issue.asset.assetId})`,
        )
        .join('\n');

      return {
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone || '',
        dateOfBirth: employee.dateOfBirth
          ? employee.dateOfBirth.toISOString().split('T')[0]
          : '',
        address: employee.address || '',
        status: employee.status,
        assetCount: relevantIssues.length,
        assetDetails,
        createdBy:
          (employee.createdByUser?.employee
            ? `${employee.createdByUser.employee.firstName} ${employee.createdByUser.employee.lastName}`.trim()
            : employee.createdByUser?.username) || 'System',
        updatedBy:
          (employee.updatedByUser?.employee
            ? `${employee.updatedByUser.employee.firstName} ${employee.updatedByUser.employee.lastName}`.trim()
            : employee.updatedByUser?.username) || 'System',
        createdAt: employee.createdAt
          .toISOString()
          .replace('T', ' ')
          .split('.')[0],
        updatedAt: employee.updatedAt
          .toISOString()
          .replace('T', ' ')
          .split('.')[0],
      };
    };

    // assetCountRange / assetTypeId require post-filter; chunked count then stream write
    if (assetCountRange || assetTypeId !== undefined) {
      await withExportLock(async () => {
        const chunkSize = getExportChunkSize();
        let matching = 0;
        let skip = 0;
        for (;;) {
          const chunk = await this.prisma.employee.findMany({
            where,
            include,
            orderBy,
            skip,
            take: chunkSize,
          });
          if (chunk.length === 0) break;
          matching += chunk.filter((e) => employeeMatchesFilters(e)).length;
          skip += chunkSize;
          if (chunk.length < chunkSize) break;
        }
        assertExportRowLimit(matching);

        const workbook = createStreamingWorkbook(res, filename);
        const worksheet = workbook.addWorksheet('Employee Asset Report');
        worksheet.columns = columns.map((c) => ({
          header: c.header,
          key: c.key,
          width: c.width ?? 15,
        }));

        skip = 0;
        for (;;) {
          const chunk = await this.prisma.employee.findMany({
            where,
            include,
            orderBy,
            skip,
            take: chunkSize,
          });
          if (chunk.length === 0) break;
          for (const employee of chunk) {
            if (!employeeMatchesFilters(employee)) continue;
            const mapped = mapEmployeeRow(employee);
            worksheet
              .addRow(columns.map((c) => mapped[c.key as keyof typeof mapped]))
              .commit();
          }
          skip += chunkSize;
          if (chunk.length < chunkSize) break;
        }

        await worksheet.commit();
        await workbook.commit();
      });
      return;
    }

    await streamRowsInChunks({
      res,
      filename,
      sheetName: 'Employee Asset Report',
      columns,
      countFn: () => this.prisma.employee.count({ where }),
      fetchChunk: (skip, take) =>
        this.prisma.employee.findMany({
          where,
          include,
          orderBy,
          skip,
          take,
        }),
      mapRow: mapEmployeeRow,
    });
  }

  async getNonAdminEmployeesForDropdown() {
    try {
      // Determine admin users via UserRole mapping (source of truth)
      const adminRole = await this.prisma.role.findFirst({
        where: { roleName: 'ADMIN' },
      });

      const adminEmployeeIds = adminRole
        ? (
            await this.prisma.user.findMany({
              where: {
                userRoles: {
                  some: {
                    roleId: adminRole.id,
                    isActive: true,
                  },
                },
              },
              select: { employeeId: true },
            })
          ).map((user) => user.employeeId)
        : [];

      // Get active employees with email addresses, excluding admins
      const employees = await this.prisma.employee.findMany({
        where: {
          status: 'ACTIVE',
          email: {
            not: '',
          },
          id: {
            notIn: adminEmployeeIds,
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          email: true,
          status: true,
        },
        orderBy: {
          firstName: 'asc',
        },
      });

      return {
        success: true,
        data: employees,
      };
    } catch (error) {
      console.error('Error fetching non-admin employees for dropdown:', error);
      throw new Error('Failed to fetch non-admin employees');
    }
  }

  // Get employees who can be deleted (non-admin with no asset history)
  async getDeletableEmployees(
    query: QueryEmployeeDto,
  ): Promise<EmployeeListResponseDto> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.EmployeeWhereInput = {
      // Include both ACTIVE and INACTIVE employees (no status filter)
      // Exclude employees with any asset history (current or past)
      assetIssues: {
        none: {}, // No asset issues at all
      },
    };

    // Exclude admin employees - get admin employee database IDs first
    const adminRole = await this.prisma.role.findFirst({
      where: { roleName: 'ADMIN' },
    });

    if (adminRole) {
      const adminUsers = await this.prisma.user.findMany({
        where: {
          userRoles: {
            some: {
              roleId: adminRole.id,
              isActive: true,
            },
          },
        },
        select: { employeeId: true },
      });

      const adminEmployeeDbIds = adminUsers
        .map((user) => user.employeeId)
        .filter((id) => id !== null);

      if (adminEmployeeDbIds.length > 0) {
        where.id = {
          notIn: adminEmployeeDbIds,
        };
      }
    }

    if (query.search) {
      const conditions = this.buildEmployeeSearchConditions(query.search);
      if (conditions.length > 0) {
        where.OR = conditions;
      }
    }

    // Build orderBy clause
    const orderBy: Prisma.EmployeeOrderByWithRelationInput = {};
    const sortOrder = query.sortOrder || 'asc';

    switch (query.sortBy) {
      case 'name':
        orderBy.firstName = sortOrder;
        break;
      case 'employeeId':
        orderBy.employeeId = sortOrder;
        break;
      case 'email':
        orderBy.email = sortOrder;
        break;
      case 'status':
        orderBy.status = sortOrder;
        break;
      case 'createdAt':
        orderBy.createdAt = sortOrder;
        break;
      default:
        orderBy.firstName = 'asc';
        break;
    }

    // Get total count
    const totalCount = await this.prisma.employee.count({ where });

    // Get deletable employees
    const employees = await this.prisma.employee.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    });

    const responseEmployees = employees.map((employee: any) => {
      const responseDto = this.mapToResponseDto(employee);
      responseDto.assignedAssetsCount = 0; // No assets assigned
      responseDto.assignedAssets = []; // No assets
      responseDto.isAdmin = false; // All deletable employees are non-admin

      return responseDto;
    });

    const totalPages = Math.ceil(totalCount / limit);

    const pagination: PaginationDto = {
      totalCount,
      currentPage: page,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };

    return {
      message:
        'Deletable employees retrieved successfully (includes both active and inactive employees without asset history)',
      data: {
        employees: responseEmployees,
        pagination,
      },
    };
  }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { QueryEmployeeDto, QueryEmployeeAssetEventsDto, AssetEventAction } from './dto/query-employee.dto';
import {
  EmployeeResponseDto,
  EmployeeListResponseDto,
  EmployeeDetailResponseDto,
  PaginationDto,
} from './dto/employee-response.dto';
import { EmployeeStatus, Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';

type AssetEventRow = {
  id: number;
  assetId: string;
  assetName: string;
  assetType: string;
  brand: string;
  model: string;
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
  constructor(private readonly prisma: PrismaService) {}

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

    // Generate employee ID
    let employeeId = await this.generateEmployeeId();

    // Convert dateOfBirth string to Date if provided
    const dateOfBirth = createEmployeeDto.dateOfBirth
      ? new Date(createEmployeeDto.dateOfBirth)
      : null;

    try {
      const employee = await this.prisma.employee.create({
        data: this.buildEmployeeCreateData(createEmployeeDto, userId, employeeId, dateOfBirth),
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
          employeeId = await this.generateEmployeeId();
          return this.prisma.employee.create({
            data: this.buildEmployeeCreateData(createEmployeeDto, userId, employeeId, dateOfBirth),
          });
        }
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

  async isEmailAvailable(email: string, excludeEmployeeId?: string): Promise<boolean> {
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    
    const whereClause: any = { email }
    if (excludeEmployeeId) {
      whereClause.employeeId = { not: excludeEmployeeId }
    }
    
    const existing = await this.prisma.employee.findFirst({ where: whereClause });
    return !existing;
  }

  async findAll(query: QueryEmployeeDto): Promise<EmployeeListResponseDto> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.EmployeeWhereInput = {};

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { employeeId: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status;
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

    // Date range by createdAt
    if ((query as any).fromDate || (query as any).toDate) {
      (where as any).createdAt = {} as any
      if ((query as any).fromDate) (where as any).createdAt.gte = new Date((query as any).fromDate)
      if ((query as any).toDate) {
        const end = new Date((query as any).toDate)
        end.setHours(23,59,59,999)
        ;(where as any).createdAt.lte = end
      }
    }

    // Get total count
    const totalCount = await this.prisma.employee.count({ where });

    // Get employees with asset assignments and admin status
    const employees = await this.prisma.employee.findMany({
      where,
      skip,
      take: limit,
      include: {
        assetIssues: {
          where: { returnDate: null }, // Only active assignments
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
              where: { returnDate: null }, // Only active assignments
            },
          },
        },
        user: {
          include: {
            userRoles: {
              where: {
                isActive: true
              },
              include: {
                role: true
              }
            }
          }
        }
      },
      orderBy,
    });

    // Filter by hasAssets or assetCountRange if specified
    let filteredEmployees = employees;
    if (query.hasAssets !== undefined) {
      filteredEmployees = employees.filter((emp) => {
        const hasAssets = emp._count.assetIssues > 0;
        return query.hasAssets ? hasAssets : !hasAssets;
      });
    } else if (query.assetCountRange) {
      filteredEmployees = employees.filter((emp) => {
        const assetCount = emp._count.assetIssues;
        switch (query.assetCountRange) {
          case '0':
            return assetCount === 0;
          case '1-2':
            return assetCount >= 1 && assetCount <= 2;
          case '3+':
            return assetCount >= 3;
          default:
            return true;
        }
      });
    }

    const responseEmployees = filteredEmployees.map((employee: any) => {
      const responseDto = this.mapToResponseDto(employee);
      responseDto.assignedAssetsCount = employee._count.assetIssues;
      responseDto.assignedAssets = employee.assetIssues.map((issue: any) => ({
        assetId: issue.asset.assetId,
        assetName: `${issue.asset.brand.name} ${issue.asset.model.name}`,
        assignedDate: issue.issueDate.toISOString().split('T')[0],
        status: 'ASSIGNED',
      }));
      
      // Add admin status
      const isAdmin = employee.user?.userRoles?.some(
        userRole => userRole.role.roleName === 'ADMIN' && userRole.isActive
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
      employeeId: employee.employeeId,
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
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
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
        [{ row: 0, field: 'file', message: 'Invalid file format. Only CSV and Excel files are allowed' }],
        0,
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return this.handleValidationOutcome(
        validateOnly,
        'File size too large. Maximum 10MB allowed',
        [{ row: 0, field: 'file', message: 'File size too large. Maximum 10MB allowed' }],
        0,
      );
    }
  }

  private parseRowsFromFile(
    file: Express.Multer.File,
    validateOnly: boolean,
  ): any[] | { message: string; data: any } {
    const isCsv = file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel';
    if (isCsv) {
      const csv = file.buffer.toString('utf-8');
      const lines = csv.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        return this.handleValidationOutcome(
          validateOnly,
          'File must contain header and at least one row',
          [{ row: 0, field: 'file', message: 'File must contain header and at least one row' }],
          0,
        );
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const headerMap: Record<string, number> = {};
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i];
        headerMap[h.toLowerCase()] = i;
      }

      const required = ['first name', 'last name', 'email'];
      const missing = required.filter(h => !(h in headerMap));
      if (missing.length) {
        return this.handleValidationOutcome(
          validateOnly,
          `Missing required headers: ${missing.join(', ')}`,
          [{ row: 0, field: 'file', message: `Missing required headers: ${missing.join(', ')}` }],
          0,
        );
      }

      const rows = lines
        .slice(1)
        .map(line => {
          const cols = line.split(',');
          const firstName = cols[headerMap['first name']]?.trim();
          const lastName = cols[headerMap['last name']]?.trim();
          return {
            firstName: firstName ? this.formatName(firstName) : firstName,
            lastName: lastName ? this.formatName(lastName) : lastName,
            email: cols[headerMap['email']]?.trim(),
            phone:
              headerMap['phone'] !== undefined
                ? cols[headerMap['phone']]?.trim()
                : undefined,
            dateOfBirth:
              headerMap['date of birth'] !== undefined
                ? cols[headerMap['date of birth']]?.trim()
                : undefined,
            address:
              headerMap['address'] !== undefined
                ? cols[headerMap['address']]?.trim()
                : undefined,
          };
        })
        .filter(r => Boolean(r.firstName || r.lastName || r.email));
      return rows;
    }

    // Excel path
    const wb = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet) as any[];
    return data.map(r => {
      const firstName = r['First Name']?.toString().trim();
      const lastName = r['Last Name']?.toString().trim();
      return {
        firstName: firstName ? this.formatName(firstName) : firstName,
        lastName: lastName ? this.formatName(lastName) : lastName,
        email: r['Email']?.toString().trim(),
        phone: r['Phone']?.toString().trim(),
        dateOfBirth: r['Date of Birth']?.toString().trim(),
        address: r['Address']?.toString().trim(),
      };
    });
  }

  async bulkUpload(file: Express.Multer.File, userId: number, validateOnly: boolean = false) {
    // Validate basic file constraints
    const precheck = this.validateIncomingFile(file, validateOnly);
    if (precheck) return precheck;

    // Parse rows
    const parsed = this.parseRowsFromFile(file!, validateOnly);
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
    const errors: Array<{ row: number; field: string; message: string }> = []
    const emails: string[] = []
    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx]
      const rowNum = idx + 2 // header is row 1
      if (!r.firstName) errors.push({ row: rowNum, field: 'firstName', message: 'First Name is required' })
      if (!r.lastName) errors.push({ row: rowNum, field: 'lastName', message: 'Last Name is required' })
      if (!r.email) errors.push({ row: rowNum, field: 'email', message: 'Email is required' })
      else emails.push(r.email.toLowerCase())
      if (r.phone && !/^\+91\s\d{10}$/.test(r.phone)) {
        errors.push({ row: rowNum, field: 'phone', message: "Phone must be '+91 ' followed by 10 digits" })
      }
      if (r.dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(r.dateOfBirth)) {
        errors.push({ row: rowNum, field: 'dateOfBirth', message: 'Date of Birth must be YYYY-MM-DD' })
      }
    }

    // Check duplicates within file
    const seen = new Set<string>()
    for (let i = 0; i < emails.length; i++) {
      const e = emails[i]
      if (seen.has(e)) {
        errors.push({ row: i + 2, field: 'email', message: 'Duplicate email in file' })
      }
      seen.add(e)
    }

    // Check duplicates against DB
    const existing = await this.prisma.employee.findMany({
      where: { email: { in: emails } },
      select: { email: true },
    })
    const existingEmails = new Set(existing.map(e => e.email.toLowerCase()))
    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx]
      if (r.email && existingEmails.has(r.email.toLowerCase())) {
        errors.push({ row: idx + 2, field: 'email', message: 'Email already exists in database' })
      }
    }

    if (validateOnly) {
      return this.buildValidationResponse(
        errors.length > 0 ? 'Validation completed with errors' : 'Validation successful',
        errors,
        rows.length,
      )
    }

    // For actual upload, throw error if validation fails
    if (errors.length > 0) {
      throw new BadRequestException({ message: 'Validation failed', errors })
    }

    // Transactional insert: all or none
    await this.prisma.$transaction(async (tx) => {
      for (const r of rows) {
        const employeeId = await this.generateEmployeeId()
        const dateOfBirth = r.dateOfBirth ? new Date(r.dateOfBirth) : null
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
          }
        })
      }
    })

    return { message: 'Employees uploaded successfully', data: { imported: rows.length, errors: [], summary: { totalRows: rows.length, successfulImports: rows.length, failedImports: 0 } } }
  }

  async findOne(
    id: string,
    includeAssets: boolean = true,
  ): Promise<EmployeeDetailResponseDto> {
    // Check if id is numeric (database ID) or string (employeeId)
    const isNumericId = /^\d+$/.test(id);
    const whereClause = isNumericId 
      ? { id: Number.parseInt(id, 10) } 
      : { employeeId: id };

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
                    role: true
                  }
                }
              }
            }
          }
        : {
            user: {
              include: {
                userRoles: {
                  include: {
                    role: true
                  }
                }
              }
            }
          },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Check if employee is an admin
    const isAdmin = employee.user?.userRoles?.some(
      userRole => userRole.role.roleName === 'ADMIN' && userRole.isActive
    ) || false;

    const responseEmployee = this.mapToResponseDto(employee);
    
    // Set admin status in the response
    responseEmployee.isAdmin = isAdmin;

    if (includeAssets && (employee as any).assetIssues) {
      responseEmployee.assignedAssetsCount = (employee as any)._count?.assetIssues || 0;
      responseEmployee.assignedAssets = (employee as any).assetIssues
        .filter((issue: any) => !issue.returnDate) // Only active assignments
        .map((issue: any) => ({
          assetId: issue.asset.assetId,
          assetName: `${issue.asset.brand.name} ${issue.asset.model.name}`,
          assignedDate: issue.issueDate.toISOString().split('T')[0],
          status: 'ASSIGNED',
          assetType: issue.asset.assetType?.name,
          brand: issue.asset.brand?.name,
          model: issue.asset.model?.name,
        }));
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
    // Check if id is numeric (database ID) or string (employeeId)
    const isNumericId = /^\d+$/.test(id);
    const whereClause = isNumericId 
      ? { id: Number.parseInt(id, 10) } 
      : { employeeId: id };

    const existingEmployee = await this.prisma.employee.findUnique({
      where: whereClause,
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: true
              }
            }
          }
        }
      }
    });

    if (!existingEmployee) {
      throw new NotFoundException('Employee not found');
    }

    // Check if employee is an admin
    const isAdmin = existingEmployee.user?.userRoles?.some(
      userRole => userRole.role.roleName === 'ADMIN' && userRole.isActive
    ) || false;

    // If employee is admin and trying to update email, prevent it completely
    if (isAdmin && updateEmployeeDto.email !== undefined) {
      console.log(`🚫 Admin email update blocked for employee ${existingEmployee.employeeId}:`, {
        employeeId: existingEmployee.employeeId,
        isAdmin,
        attemptedEmail: updateEmployeeDto.email,
        currentEmail: existingEmployee.email
      });
      throw new BadRequestException('Cannot update email address for admin employees. Email field is read-only for admin users.');
    }

    // If employee is admin and trying to deactivate, prevent it completely
    if (isAdmin && updateEmployeeDto.status === 'INACTIVE') {
      console.log(`🚫 Admin deactivation blocked for employee ${existingEmployee.employeeId}:`, {
        employeeId: existingEmployee.employeeId,
        isAdmin,
        currentStatus: existingEmployee.status,
        attemptedStatus: updateEmployeeDto.status
      });
      throw new BadRequestException('Cannot deactivate admin employees. Admin users must remain active.');
    }

    // Check if email is being updated and already exists (only for non-admin employees)
    if (!isAdmin && updateEmployeeDto.email && updateEmployeeDto.email !== existingEmployee.email) {
      const emailExists = await this.prisma.employee.findUnique({
        where: { email: updateEmployeeDto.email },
      });

      if (emailExists) {
        throw new ConflictException('Employee with this email already exists');
      }
    }

    // Convert dateOfBirth string to Date if provided
    const dateOfBirth = updateEmployeeDto.dateOfBirth
      ? new Date(updateEmployeeDto.dateOfBirth)
      : undefined;

    // Format names if they are being updated
    const updateData: any = {
      ...updateEmployeeDto,
      dateOfBirth,
      updatedBy: userId,
    };
    
    // Remove email from update data if employee is admin
    if (isAdmin) {
      delete updateData.email;
    }
    
    if (updateEmployeeDto.firstName) {
      updateData.firstName = this.formatName(updateEmployeeDto.firstName);
    }
    if (updateEmployeeDto.lastName) {
      updateData.lastName = this.formatName(updateEmployeeDto.lastName);
    }

    const employee = await this.prisma.employee.update({
      where: whereClause,
      data: updateData,
    });

    const responseEmployee = this.mapToResponseDto(employee);
    
    // Add admin status to response
    responseEmployee.isAdmin = isAdmin;

    // Log successful update
    if (isAdmin) {
      console.log(`✅ Admin employee updated successfully (email excluded):`, {
        employeeId: employee.employeeId,
        updatedFields: Object.keys(updateData).filter(key => key !== 'updatedBy'),
        emailExcluded: true
      });
    }

    return {
      message: 'Employee updated successfully',
      data: {
        employee: responseEmployee,
      },
    };
  }

  async remove(
    id: string,
    userId: number,
    reassignAssetsTo?: string,
  ): Promise<EmployeeDetailResponseDto> {
    // Check if id is numeric (database ID) or string (employeeId)
    const isNumericId = /^\d+$/.test(id);
    const whereClause = isNumericId 
      ? { id: Number.parseInt(id, 10) } 
      : { employeeId: id };

    const employee = await this.prisma.employee.findUnique({
      where: whereClause,
      include: {
        assetIssues: {
          where: { returnDate: null },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Check if employee has assigned assets
    if (employee.assetIssues.length > 0 && !reassignAssetsTo) {
      throw new BadRequestException(
        'Cannot delete employee with assigned assets without reassignment',
      );
    }

    // If reassigning assets, validate the target employee
    if (reassignAssetsTo) {
      const targetEmployee = await this.prisma.employee.findUnique({
        where: { employeeId: reassignAssetsTo },
      });

      if (!targetEmployee) {
        throw new NotFoundException('Target employee for reassignment not found');
      }

      // Update asset assignments
      await this.prisma.assetIssue.updateMany({
        where: {
          employeeId: employee.id,
          returnDate: null,
        },
        data: {
          employeeId: targetEmployee.id,
          updatedBy: userId,
        },
      });
    }

    // Soft delete - mark as inactive
    const updatedEmployee = await this.prisma.employee.update({
      where: whereClause,
      data: {
        status: EmployeeStatus.INACTIVE,
        updatedBy: userId,
      },
    });

    const responseEmployee = this.mapToResponseDto(updatedEmployee);

    return {
      message: 'Employee deleted successfully',
      data: {
        employee: {
          ...responseEmployee,
          assignedAssetsCount: employee.assetIssues.length,
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
       WHERE employee_id ~ '^EMP-?\\d+$' AND regexp_replace(employee_id, '\\D', '', 'g') != ''`
    );
    const maxNum: number = Array.isArray(result) && result.length > 0 ? Number(result[0]?.max_num ?? 0) : 0;
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
      select: { id: true, employeeId: true, firstName: true, lastName: true }
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Get only completed asset assignments (assigned and returned) for this employee
    const assetIssues = await this.prisma.assetIssue.findMany({
      where: { 
        employeeId: employee.id,
        returnDate: { not: null } // Only show completed assignments (returned assets)
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
      const duration = Math.ceil((new Date(issue.returnDate!).getTime() - new Date(issue.issueDate).getTime()) / (1000 * 60 * 60 * 24));

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
      pagination: { totalCount: number; currentPage: number; totalPages: number; hasNext: boolean; hasPrevious: boolean };
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
            equals: employee.employeeId
          }
        }
      ]
    };

    // Fetch asset events from AssetEvent table
    const events = await this.prisma.assetEvent.findMany({
      where,
      include: {
        asset: {
          include: {
            assetType: { select: { name: true } },
            brand: { select: { name: true } },
            model: { select: { name: true } },
          },
        },
        performedByUser: { 
          select: { 
            username: true, 
            employee: { 
              select: { 
                firstName: true, 
                lastName: true, 
                employeeId: true 
              } 
            } 
          } 
        },
      },
      orderBy: { eventDate: 'desc' },
    });

    // Transform events, apply filters and sorting via helpers
    const transformed: AssetEventRow[] = events
      .map((event) => this.transformAssetEvent(event))
      .filter((row): row is AssetEventRow => row !== null);

    const filtered = this.applyAssetEventFilters(transformed, query);
    this.sortAssetEvents(filtered, query.sortBy ?? 'date', (query.sortOrder ?? 'desc') === 'asc' ? 1 : -1);

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const pageSafe = Math.min(Math.max(page, 1), totalPages);
    const start = (pageSafe - 1) * limit;
    const end = start + limit;
    const pageItems = filtered.slice(start, end).map((e) => ({
      id: e.id,
      assetId: e.assetId,
      assetName: e.assetName,
      assetType: e.assetType,
      brand: e.brand,
      model: e.model,
      action: e.action,
      date: e.date.toISOString().split('T')[0],
      timestamp: e.timestamp.toISOString(),
      condition: e.condition,
      reason: e.reason,
      notes: e.notes,
      performedBy: e.performedBy,
    }));

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
    return full || event.performedByUser.employee?.employeeId || event.performedByUser.username;
  }

  private transformAssetEvent(event: any): AssetEventRow | null {
    const performedByName = this.getPerformedByName(event);
    const metadata = event.metadata as any;
    if (event.eventType === 'ASSET_ISSUED') {
      return {
        id: event.id,
        assetId: event.asset.assetId,
        assetName: `${event.asset.brand.name} ${event.asset.model.name}`,
        assetType: event.asset.assetType.name,
        brand: event.asset.brand.name,
        model: event.asset.model.name,
        action: 'ASSIGNED',
        date: metadata?.issueDate ? new Date(metadata.issueDate) : new Date(event.eventDate),
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
        action: 'RETURNED',
        date: metadata?.returnDate ? new Date(metadata.returnDate) : new Date(event.eventDate),
        timestamp: new Date(event.eventDate),
        condition: metadata?.returnCondition || undefined,
        reason: metadata?.returnReason || undefined,
        notes: metadata?.notes || undefined,
        performedBy: performedByName,
      };
    }
    return null;
  }

  private applyAssetEventFilters(rows: AssetEventRow[], query: QueryEmployeeAssetEventsDto): AssetEventRow[] {
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
      filtered = filtered.filter((e) =>
        e.assetId.toLowerCase().includes(q) ||
        e.assetName.toLowerCase().includes(q) ||
        e.brand.toLowerCase().includes(q) ||
        e.model.toLowerCase().includes(q)
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

  private sortAssetEvents(rows: AssetEventRow[], sortBy: string, sortOrder: 1 | -1): void {
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'action') cmp = a.action.localeCompare(b.action);
      else if (sortBy === 'assetType') cmp = a.assetType.localeCompare(b.assetType);
      else cmp = a.timestamp.getTime() - b.timestamp.getTime();
      return cmp * sortOrder;
    });
  }
  private mapToResponseDto(employee: any): EmployeeResponseDto {
    return {
      id: employee.id.toString(),
      employeeId: employee.employeeId,
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

  private buildEmployeeCreateData(
    createEmployeeDto: CreateEmployeeDto,
    userId: number,
    employeeId: string,
    dateOfBirth: Date | null
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
    retryWithNewEmployeeId: () => Promise<any>
  ): Promise<any | null> {
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
      } catch (_) {
        throw new ConflictException('Employee with this employee ID already exists');
      }
    }
    // Default precise message when meta.target is missing or unknown
    throw new ConflictException('Employee with this email already exists');
  }

  // Export employees to Excel with asset details
  async exportEmployeesToExcel(queryDto: QueryEmployeeDto) {
    try {
      const { search, status, hasAssets, assetCountRange, sortBy = 'firstName', sortOrder = 'asc' } = queryDto;

      // Build where clause
      const where: Prisma.EmployeeWhereInput = {};

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { employeeId: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (status) {
        where.status = status;
      }

      if (hasAssets !== undefined) {
        if (hasAssets) {
          where.assetIssues = { some: { returnDate: null } };
        } else {
          where.assetIssues = { none: { returnDate: null } };
        }
      }

      // Note: assetCountRange filtering will be handled after fetching data

      // Build orderBy clause
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

      // Use the where clause as is since we removed assetCountRange assignment

      // Get all employees with related data
      let employees = await this.prisma.employee.findMany({
        where,
        include: {
          createdByUser: { select: { id: true, username: true } },
          updatedByUser: { select: { id: true, username: true } },
          assetIssues: {
            where: { returnDate: null }, // Only active assignments
            include: {
              asset: {
                include: {
                  assetType: { select: { name: true } },
                  brand: { select: { name: true } },
                  model: { select: { name: true } },
                }
              }
            }
          }
        },
        orderBy
      });

      // Filter by asset count range if specified
      if (assetCountRange) {
        employees = employees.filter(employee => {
          const assetCount = employee.assetIssues.length;
          switch (assetCountRange) {
            case '0':
              return assetCount === 0;
            case '1-2':
              return assetCount >= 1 && assetCount <= 2;
            case '3+':
              return assetCount >= 3;
            default:
              return true;
          }
        });
      }

      // Prepare data for Excel export
      const exportData = employees.map(employee => {
        // Format asset details as requested: "del thinkpad (AST-0001)"
        const assetDetails = employee.assetIssues.map(issue => 
          `${issue.asset.brand.name} ${issue.asset.model.name} (${issue.asset.assetId})`
        ).join('\n');

        return [
          employee.employeeId,
          employee.firstName,
          employee.lastName,
          employee.email,
          employee.phone || '',
          employee.dateOfBirth ? employee.dateOfBirth.toISOString().split('T')[0] : '',
          employee.address || '',
          employee.status,
          employee.assetIssues.length, // Number of assets
          assetDetails, // Asset details in one cell
          employee.createdByUser?.username || 'System',
          employee.updatedByUser?.username || 'System',
          employee.createdAt.toISOString().replace('T', ' ').split('.')[0],
          employee.updatedAt.toISOString().replace('T', ' ').split('.')[0]
        ];
      });

      const headers = [
        'Employee ID',
        'First Name', 
        'Last Name',
        'Email',
        'Phone',
        'Date of Birth',
        'Address',
        'Status',
        'Number of Assets',
        'Asset Details',
        'Created By',
        'Updated By',
        'Created At',
        'Updated At'
      ];

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...exportData]);

      // Set column widths
      const columnWidths = [
        { wch: 12 }, // Employee ID
        { wch: 15 }, // First Name
        { wch: 15 }, // Last Name
        { wch: 25 }, // Email
        { wch: 15 }, // Phone
        { wch: 12 }, // Date of Birth
        { wch: 30 }, // Address
        { wch: 10 }, // Status
        { wch: 15 }, // Number of Assets
        { wch: 50 }, // Asset Details
        { wch: 15 }, // Created By
        { wch: 15 }, // Updated By
        { wch: 12 }, // Created At
        { wch: 12 }, // Updated At
      ];
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee Asset Report');

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      return excelBuffer;
    } catch (error) {
      console.error('Error exporting employees to Excel:', error);
      throw new Error('Failed to export employees to Excel');
    }
  }

  async getNonAdminEmployeesForDropdown() {
    try {
      // Determine admin users via UserRole mapping (source of truth)
      const adminRole = await this.prisma.role.findFirst({
        where: { roleName: 'ADMIN' }
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
            not: ''
          },
          id: {
            notIn: adminEmployeeIds
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          email: true,
          status: true
        },
        orderBy: {
          firstName: 'asc'
        }
      });

      return {
        success: true,
        data: employees
      };
    } catch (error) {
      console.error('Error fetching non-admin employees for dropdown:', error);
      throw new Error('Failed to fetch non-admin employees');
    }
  }

  // Get employees who can be deleted (non-admin with no asset history)
  async getDeletableEmployees(query: QueryEmployeeDto): Promise<EmployeeListResponseDto> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.EmployeeWhereInput = {
      status: 'ACTIVE', // Only active employees
      // Exclude employees with any asset history (current or past)
      assetIssues: {
        none: {} // No asset issues at all
      }
    };

    // Exclude admin employees - get admin employee database IDs first
    const adminRole = await this.prisma.role.findFirst({
      where: { roleName: 'ADMIN' }
    });

    if (adminRole) {
      const adminUsers = await this.prisma.user.findMany({
        where: {
          userRoles: {
            some: {
              roleId: adminRole.id,
              isActive: true
            }
          }
        },
        select: { employeeId: true }
      });

      const adminEmployeeDbIds = adminUsers.map(user => user.employeeId).filter(id => id !== null);
      
      if (adminEmployeeDbIds.length > 0) {
        where.id = {
          notIn: adminEmployeeDbIds
        };
      }
    }

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { employeeId: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
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
      message: 'Deletable employees retrieved successfully',
      data: {
        employees: responseEmployees,
        pagination,
      },
    };
  }
} 
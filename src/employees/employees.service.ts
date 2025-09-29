import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { QueryEmployeeDto } from './dto/query-employee.dto';
import {
  EmployeeResponseDto,
  EmployeeListResponseDto,
  EmployeeDetailResponseDto,
  PaginationDto,
} from './dto/employee-response.dto';
import { EmployeeStatus, Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

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
        data: {
          employeeId,
          firstName: createEmployeeDto.firstName,
          lastName: createEmployeeDto.lastName,
          email: createEmployeeDto.email,
          phone: createEmployeeDto.phone,
          dateOfBirth,
          address: createEmployeeDto.address,
          status: EmployeeStatus.ACTIVE,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      const responseEmployee = this.mapToResponseDto(employee);

      return {
        message: 'Employee created successfully',
        data: {
          employee: responseEmployee,
        },
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Determine which unique constraint failed to return accurate message
          const target = (error as any).meta?.target as string[] | undefined
          if (target?.includes('email') || String(target).includes('email')) {
            throw new ConflictException('Employee with this email already exists');
          }
          if (target?.includes('employee_id') || String(target).includes('employee_id') || String(target).includes('employeeId')) {
            // In rare case of race, regenerate once and retry
            try {
              employeeId = await this.generateEmployeeId();
              const employee = await this.prisma.employee.create({
                data: {
                  employeeId,
                  firstName: createEmployeeDto.firstName,
                  lastName: createEmployeeDto.lastName,
                  email: createEmployeeDto.email,
                  phone: createEmployeeDto.phone,
                  dateOfBirth,
                  address: createEmployeeDto.address,
                  status: EmployeeStatus.ACTIVE,
                  createdBy: userId,
                  updatedBy: userId,
                },
              });
              const responseEmployee = this.mapToResponseDto(employee);
              return {
                message: 'Employee created successfully',
                data: { employee: responseEmployee },
              };
            } catch (_) {
              throw new ConflictException('Employee with this employee ID already exists');
            }
          }
          throw new ConflictException('Employee with this email already exists');
        }
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

    // Get total count
    const totalCount = await this.prisma.employee.count({ where });

    // Get employees with asset assignments
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

  async findAllForDropdowns(status?: string) {
    // Build where clause
    const where: Prisma.EmployeeWhereInput = {};

    // Default to ACTIVE if no status specified
    if (status) {
      where.status = status as EmployeeStatus;
    } else {
      where.status = 'ACTIVE';
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

  async bulkUpload(file: Express.Multer.File, userId: number, validateOnly: boolean = false) {
    if (!file) {
      throw new BadRequestException('File is required')
    }

    const allowedMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file format. Only CSV and Excel files are allowed')
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File size too large. Maximum 10MB allowed')
    }

    // Parse file
    let rows: any[] = []
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      const csv = file.buffer.toString('utf-8')
      const lines = csv.split(/\r?\n/).filter(l => l.trim().length > 0)
      if (lines.length < 2) throw new BadRequestException('File must contain header and at least one row')
      const headers = lines[0].split(',').map(h => h.trim())
      const headerMap: Record<string, number> = {}
      headers.forEach((h, i) => headerMap[h.toLowerCase()] = i)
      const required = ['first name','last name','email']
      const missing = required.filter(h => !(h in headerMap))
      if (missing.length) throw new BadRequestException(`Missing required headers: ${missing.join(', ')}`)
      rows = lines.slice(1).map(line => {
        const cols = line.split(',')
        return {
          firstName: cols[headerMap['first name']]?.trim(),
          lastName: cols[headerMap['last name']]?.trim(),
          email: cols[headerMap['email']]?.trim(),
          phone: headerMap['phone'] !== undefined ? cols[headerMap['phone']]?.trim() : undefined,
          dateOfBirth: headerMap['date of birth'] !== undefined ? cols[headerMap['date of birth']]?.trim() : undefined,
          address: headerMap['address'] !== undefined ? cols[headerMap['address']]?.trim() : undefined,
        }
      }).filter(r => r.firstName || r.lastName || r.email)
    } else {
      const wb = XLSX.read(file.buffer, { type: 'buffer' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(sheet) as any[]
      rows = data.map(r => ({
        firstName: r['First Name']?.toString().trim(),
        lastName: r['Last Name']?.toString().trim(),
        email: r['Email']?.toString().trim(),
        phone: r['Phone']?.toString().trim(),
        dateOfBirth: r['Date of Birth']?.toString().trim(),
        address: r['Address']?.toString().trim(),
      }))
    }

    if (rows.length === 0) throw new BadRequestException('File has no valid rows')

    // Basic validation + collect emails
    const errors: Array<{ row: number; field: string; message: string }> = []
    const emails: string[] = []
    rows.forEach((r, idx) => {
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
    })

    // Check duplicates within file
    const seen = new Set<string>()
    emails.forEach((e, idx) => {
      if (seen.has(e)) errors.push({ row: idx + 2, field: 'email', message: 'Duplicate email in file' })
      seen.add(e)
    })

    // Check duplicates against DB
    const existing = await this.prisma.employee.findMany({
      where: { email: { in: emails } },
      select: { email: true },
    })
    const existingEmails = new Set(existing.map(e => e.email.toLowerCase()))
    rows.forEach((r, idx) => {
      if (existingEmails.has(r.email?.toLowerCase())) {
        errors.push({ row: idx + 2, field: 'email', message: 'Email already exists in database' })
      }
    })

    if (errors.length > 0) {
      throw new BadRequestException({ message: 'Validation failed', errors })
    }

    if (validateOnly) {
      return { message: 'Validation successful', data: { imported: 0, errors: [], summary: { totalRows: rows.length, successfulImports: 0, failedImports: 0 } } }
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
    const employee = await this.prisma.employee.findUnique({
      where: { employeeId: id },
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
          }
        : undefined,
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const responseEmployee = this.mapToResponseDto(employee);

    if (includeAssets && (employee as any).assetIssues) {
      responseEmployee.assignedAssetsCount = (employee as any)._count?.assetIssues || 0;
      responseEmployee.assignedAssets = (employee as any).assetIssues
        .filter((issue: any) => !issue.returnDate) // Only active assignments
        .map((issue: any) => ({
          assetId: issue.asset.assetId,
          assetName: `${issue.asset.brand.name} ${issue.asset.model.name}`,
          assignedDate: issue.issueDate.toISOString().split('T')[0],
          status: 'ASSIGNED',
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
    const existingEmployee = await this.prisma.employee.findUnique({
      where: { employeeId: id },
    });

    if (!existingEmployee) {
      throw new NotFoundException('Employee not found');
    }

    // Check if email is being updated and already exists
    if (updateEmployeeDto.email && updateEmployeeDto.email !== existingEmployee.email) {
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

    const employee = await this.prisma.employee.update({
      where: { employeeId: id },
      data: {
        ...updateEmployeeDto,
        dateOfBirth,
        updatedBy: userId,
      },
    });

    const responseEmployee = this.mapToResponseDto(employee);

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
    const employee = await this.prisma.employee.findUnique({
      where: { employeeId: id },
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
      where: { employeeId: id },
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
    };
  }
} 
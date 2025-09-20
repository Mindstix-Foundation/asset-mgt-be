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
    const employeeId = await this.generateEmployeeId();

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
    const lastEmployee = await this.prisma.employee.findFirst({
      orderBy: { id: 'desc' },
      select: { employeeId: true },
    });

    if (!lastEmployee) {
      return 'EMP-001';
    }

    // Extract number from EMP-XXX format
    const match = lastEmployee.employeeId.match(/EMP-(\d+)/);
    if (match) {
      const nextNumber = parseInt(match[1]) + 1;
      return `EMP-${nextNumber.toString().padStart(3, '0')}`;
    }

    // Fallback if format doesn't match
    return 'EMP-001';
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
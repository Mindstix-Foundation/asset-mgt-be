import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssignmentDto, ReturnAssignmentDto, AssignmentQueryDto } from './dto';

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  async create(createAssignmentDto: CreateAssignmentDto, userId: number) {
    try {
      // Verify asset and employee exist
      const [asset, employee] = await Promise.all([
        this.prisma.asset.findUnique({ 
          where: { id: createAssignmentDto.assetId },
          include: {
            assetIssues: {
              where: { returnDate: null },
              select: { id: true }
            }
          }
        }),
        this.prisma.employee.findUnique({ where: { id: createAssignmentDto.employeeId } }),
      ]);

      if (!asset) {
        throw new BadRequestException('Asset not found');
      }
      if (!employee) {
        throw new BadRequestException('Employee not found');
      }

      // Check if asset is available
      if (asset.status !== 'AVAILABLE') {
        throw new BadRequestException(`Asset is currently ${asset.status.toLowerCase()} and cannot be assigned`);
      }

      // Check if asset has active assignments
      if (asset.assetIssues.length > 0) {
        throw new BadRequestException('Asset is already assigned to another employee');
      }

      // Create assignment and update asset status in a transaction
      const result = await this.prisma.$transaction(async (prisma) => {
        // Create the assignment
        const assignment = await prisma.assetIssue.create({
          data: {
            assetId: createAssignmentDto.assetId,
            employeeId: createAssignmentDto.employeeId,
            issuedBy: userId,
            issueDate: new Date(createAssignmentDto.issueDate),
            issueCondition: createAssignmentDto.issueCondition,
            issueReason: createAssignmentDto.issueReason,
            notes: createAssignmentDto.notes,
            createdBy: userId,
            updatedBy: userId,
          },
          include: {
            asset: {
              select: {
                id: true,
                assetId: true,
                assetType: { select: { id: true, name: true } },
                brand: { select: { id: true, name: true } },
                model: { select: { id: true, name: true } },
                condition: true,
                status: true,
              }
            },
            employee: {
              select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                email: true,
              }
            },
            issuedByUser: {
              select: { id: true, username: true }
            }
          },
        });

        // Update asset status to ASSIGNED
        await prisma.asset.update({
          where: { id: createAssignmentDto.assetId },
          data: { 
            status: 'ASSIGNED',
            updatedBy: userId,
          },
        });

        return assignment;
      });

      return {
        message: 'Asset assigned successfully',
        data: { assignment: result },
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Assignment already exists');
      }
      throw error;
    }
  }

  async findAllActiveForCollect(queryDto: AssignmentQueryDto) {
    const { page = 1, limit = 10, search, assetId, employeeId, sortBy = 'issueDate', sortOrder = 'desc' } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      returnDate: null, // Only active assignments
    };

    if (search) {
      where.OR = [
        { asset: { assetId: { contains: search, mode: 'insensitive' as const } } },
        { employee: { firstName: { contains: search, mode: 'insensitive' as const } } },
        { employee: { lastName: { contains: search, mode: 'insensitive' as const } } },
        { notes: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    if (assetId) where.assetId = assetId;
    if (employeeId) where.employeeId = employeeId;

    const orderBy = { [sortBy]: sortOrder } as any;

    const [assignments, totalCount] = await Promise.all([
      this.prisma.assetIssue.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          asset: {
            select: {
              id: true,
              assetId: true,
              serialNumber: true,
              assetType: { select: { id: true, name: true } },
              brand: { select: { id: true, name: true } },
              model: { 
                select: { 
                  id: true, 
                  name: true,
                  specifications: true
                } 
              },
              condition: true,
              status: true,
              location: true,
            }
          },
          employee: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              email: true,
            }
          },
          issuedByUser: {
            select: { id: true, username: true }
          }
        },
      }),
      this.prisma.assetIssue.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      message: 'Active assignments retrieved successfully',
      data: {
        assignments,
        pagination: {
          totalCount,
          currentPage: page,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      },
    };
  }

  async findAllActive(queryDto: AssignmentQueryDto) {
    const { page = 1, limit = 10, search, assetId, employeeId, sortBy = 'issueDate', sortOrder = 'desc' } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      returnDate: null, // Only active assignments
    };

    if (search) {
      where.OR = [
        { asset: { assetId: { contains: search, mode: 'insensitive' as const } } },
        { employee: { firstName: { contains: search, mode: 'insensitive' as const } } },
        { employee: { lastName: { contains: search, mode: 'insensitive' as const } } },
        { notes: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    if (assetId) where.assetId = assetId;
    if (employeeId) where.employeeId = employeeId;

    const orderBy = { [sortBy]: sortOrder } as any;

    const [assignments, totalCount] = await Promise.all([
      this.prisma.assetIssue.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          asset: {
            select: {
              id: true,
              assetId: true,
              assetType: { select: { id: true, name: true } },
              brand: { select: { id: true, name: true } },
              model: { select: { id: true, name: true } },
              condition: true,
              status: true,
              location: true,
            }
          },
          employee: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              email: true,
            }
          },
          issuedByUser: {
            select: { id: true, username: true }
          }
        },
      }),
      this.prisma.assetIssue.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      message: 'Active assignments retrieved successfully',
      data: {
        assignments,
        pagination: {
          totalCount,
          currentPage: page,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      },
    };
  }

  async findAll(queryDto: AssignmentQueryDto) {
    const { page = 1, limit = 10, search, assetId, employeeId, active, sortBy = 'issueDate', sortOrder = 'desc' } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { asset: { assetId: { contains: search, mode: 'insensitive' as const } } },
        { employee: { firstName: { contains: search, mode: 'insensitive' as const } } },
        { employee: { lastName: { contains: search, mode: 'insensitive' as const } } },
        { notes: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    if (assetId) where.assetId = assetId;
    if (employeeId) where.employeeId = employeeId;
    
    // Filter by active/inactive assignments
    if (active !== undefined) {
      if (active) {
        where.returnDate = null; // Active assignments
      } else {
        where.returnDate = { not: null }; // Returned assignments
      }
    }

    const orderBy = { [sortBy]: sortOrder } as any;

    const [assignments, totalCount] = await Promise.all([
      this.prisma.assetIssue.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          asset: {
            select: {
              id: true,
              assetId: true,
              assetType: { select: { id: true, name: true } },
              brand: { select: { id: true, name: true } },
              model: { select: { id: true, name: true } },
              condition: true,
              status: true,
              location: true,
            }
          },
          employee: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              email: true,
            }
          },
          issuedByUser: {
            select: { id: true, username: true }
          }
        },
      }),
      this.prisma.assetIssue.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      message: 'Assignments retrieved successfully',
      data: {
        assignments,
        pagination: {
          totalCount,
          currentPage: page,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      },
    };
  }

  async findOne(id: number) {
    const assignment = await this.prisma.assetIssue.findUnique({
      where: { id },
      include: {
        asset: {
          select: {
            id: true,
            assetId: true,
            serialNumber: true,
            assetType: { 
              select: { 
                id: true, 
                name: true,
                category: { select: { id: true, name: true } }
              } 
            },
            brand: { select: { id: true, name: true } },
            model: { select: { id: true, name: true, specifications: true } },
            condition: true,
            status: true,
            location: true,
            purchaseDate: true,
            warrantyEndDate: true,
          }
        },
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          }
        },
        issuedByUser: {
          select: { id: true, username: true }
        },
        createdByUser: {
          select: { id: true, username: true }
        },
        updatedByUser: {
          select: { id: true, username: true }
        }
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    return {
      message: 'Assignment retrieved successfully',
      data: { assignment },
    };
  }

  async returnAsset(id: number, returnAssignmentDto: ReturnAssignmentDto, userId: number) {
    try {
      // Find the active assignment
      const assignment = await this.prisma.assetIssue.findUnique({
        where: { id },
        include: {
          asset: { select: { id: true, status: true } }
        }
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      if (assignment.returnDate) {
        throw new BadRequestException('Asset has already been returned');
      }

      // Return asset and update asset status in a transaction
      const result = await this.prisma.$transaction(async (prisma) => {
        // Update the assignment with return details
        const updatedAssignment = await prisma.assetIssue.update({
          where: { id },
          data: {
            returnDate: new Date(returnAssignmentDto.returnDate),
            returnCondition: returnAssignmentDto.returnCondition,
            returnReason: returnAssignmentDto.returnReason,
            notes: returnAssignmentDto.notes || assignment.notes,
            updatedBy: userId,
          },
          include: {
            asset: {
              select: {
                id: true,
                assetId: true,
                assetType: { select: { id: true, name: true } },
                brand: { select: { id: true, name: true } },
                model: { select: { id: true, name: true } },
                condition: true,
                status: true,
              }
            },
            employee: {
              select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                email: true,
              }
            },
            issuedByUser: {
              select: { id: true, username: true }
            },
            updatedByUser: {
              select: { id: true, username: true }
            }
          },
        });

        // Update asset status back to AVAILABLE and condition if needed
        const assetUpdateData: any = {
          status: 'AVAILABLE',
          updatedBy: userId,
        };

        // Update asset condition based on return condition
        if (returnAssignmentDto.returnCondition === 'DAMAGED') {
          assetUpdateData.condition = 'DAMAGED';
        } else if (returnAssignmentDto.returnCondition === 'POOR') {
          assetUpdateData.condition = 'POOR';
        }

        await prisma.asset.update({
          where: { id: assignment.assetId },
          data: assetUpdateData,
        });

        return updatedAssignment;
      });

      return {
        message: 'Asset returned successfully',
        data: { assignment: result },
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Assignment not found');
      }
      throw error;
    }
  }

  // Helper method for creating default user
  async getOrCreateDefaultUser(): Promise<number> {
    let defaultUser = await this.prisma.user.findFirst({
      where: { username: 'system' },
    });

    if (!defaultUser) {
      // Create default employee first
      const defaultEmployee = await this.prisma.employee.create({
        data: {
          employeeId: 'SYS001',
          firstName: 'System',
          lastName: 'User',
          email: 'system@company.com',
          createdBy: 1, // Bootstrap
          updatedBy: 1,
        },
      });

      defaultUser = await this.prisma.user.create({
        data: {
          employeeId: defaultEmployee.id,
          username: 'system',
          passwordHash: 'system',
          createdBy: 1, // Bootstrap
          updatedBy: 1,
        },
      });
    }

    return defaultUser.id;
  }
} 
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import {
  CreateAssignmentDto,
  ReturnAssignmentDto,
  AssignmentQueryDto,
} from './dto';
import { AssetEventType, AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(createAssignmentDto: CreateAssignmentDto, userId: number) {
    try {
      // Verify asset and employee exist
      const [asset, employee] = await Promise.all([
        this.prisma.asset.findUnique({
          where: { id: createAssignmentDto.assetId },
          include: {
            assetIssues: {
              where: { returnDate: null },
              select: { id: true },
            },
          },
        }),
        this.prisma.employee.findUnique({
          where: { id: createAssignmentDto.employeeId },
        }),
      ]);

      if (!asset) {
        throw new BadRequestException('Asset not found');
      }
      if (!employee) {
        throw new BadRequestException('Employee not found');
      }

      // Check if asset is non-assigned
      if (asset.status !== 'NON_ASSIGNED') {
        throw new BadRequestException(
          `Asset is currently ${asset.status.toLowerCase()} and cannot be assigned`,
        );
      }

      // Block assignment of assets in TRASH condition
      if (asset.condition === 'TRASH') {
        throw new BadRequestException(
          'This asset is marked as TRASH and cannot be assigned. Please update its condition first.',
        );
      }

      // Check if asset has active assignments
      if (asset.assetIssues.length > 0) {
        throw new BadRequestException(
          'Asset is already assigned to another employee',
        );
      }

      // Create assignment and update asset status in a transaction
      const result = await this.prisma.$transaction(async (prisma) => {
        // Create the assignment
        const assignment = await prisma.assetIssue.create({
          data: {
            assetId: createAssignmentDto.assetId,
            employeeId: createAssignmentDto.employeeId,
            issuedBy: userId,
            issueDate: new Date(createAssignmentDto.issueDate), // Business date
            issueTimestamp: new Date(), // Audit timestamp (current UTC time)
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
              },
            },
            employee: {
              select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            issuedByUser: {
              select: { id: true, username: true },
            },
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

        // Log asset issue event
        await prisma.assetEvent.create({
          data: {
            assetId: createAssignmentDto.assetId,
            eventType: AssetEventType.ASSET_ISSUED,
            eventDate: new Date(),
            performedBy: userId,
            metadata: {
              assignmentId: assignment.id,
              employeeId: assignment.employee.employeeId,
              employeeName: `${assignment.employee.firstName} ${assignment.employee.lastName}`,
              employeeEmail: assignment.employee.email,
              issuedBy: assignment.issuedByUser.username,
              issueDate: assignment.issueDate,
              issueCondition: assignment.issueCondition,
              issueReason: assignment.issueReason,
              notes: assignment.notes,
              previousStatus: 'NON_ASSIGNED',
              newStatus: 'ASSIGNED',
              issuedVia: 'IssueAssetView',
            },
          },
        });

        return assignment;
      });

      await this.auditService.log({
        tableName: 'asset_issues',
        recordId: result.id,
        action: AuditAction.INSERT,
        userId,
        entityLabel: `${result.asset.assetId} → ${result.employee.firstName} ${result.employee.lastName}`,
        summary: `Issued asset ${result.asset.assetId} to ${result.employee.firstName} ${result.employee.lastName}`,
        after: {
          assetId: result.asset.assetId,
          employeeId: result.employee.employeeId,
          employeeName: `${result.employee.firstName} ${result.employee.lastName}`,
          issueCondition: result.issueCondition,
          issueReason: result.issueReason,
        },
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
    const {
      page = 1,
      limit = 10,
      search,
      assetId,
      employeeId,
      sortBy = 'issueDate',
      sortOrder = 'desc',
    } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      returnDate: null, // Only active assignments
    };

    if (search) {
      where.OR = [
        {
          asset: {
            assetId: { contains: search, mode: 'insensitive' as const },
          },
        },
        {
          employee: {
            firstName: { contains: search, mode: 'insensitive' as const },
          },
        },
        {
          employee: {
            lastName: { contains: search, mode: 'insensitive' as const },
          },
        },
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
                  specifications: true,
                },
              },
              condition: true,
              status: true,
              location: true,
            },
          },
          employee: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          issuedByUser: {
            select: { id: true, username: true },
          },
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
    const {
      page = 1,
      limit = 10,
      search,
      assetId,
      employeeId,
      sortBy = 'issueDate',
      sortOrder = 'desc',
    } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      returnDate: null, // Only active assignments
    };

    if (search) {
      where.OR = [
        {
          asset: {
            assetId: { contains: search, mode: 'insensitive' as const },
          },
        },
        {
          employee: {
            firstName: { contains: search, mode: 'insensitive' as const },
          },
        },
        {
          employee: {
            lastName: { contains: search, mode: 'insensitive' as const },
          },
        },
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
            },
          },
          employee: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          issuedByUser: {
            select: { id: true, username: true },
          },
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
    const {
      page = 1,
      limit = 10,
      search,
      assetId,
      employeeId,
      active,
      sortBy = 'issueDate',
      sortOrder = 'desc',
    } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        {
          asset: {
            assetId: { contains: search, mode: 'insensitive' as const },
          },
        },
        {
          employee: {
            firstName: { contains: search, mode: 'insensitive' as const },
          },
        },
        {
          employee: {
            lastName: { contains: search, mode: 'insensitive' as const },
          },
        },
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
            },
          },
          employee: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          issuedByUser: {
            select: { id: true, username: true },
          },
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
                category: { select: { id: true, name: true } },
              },
            },
            brand: { select: { id: true, name: true } },
            model: { select: { id: true, name: true, specifications: true } },
            condition: true,
            status: true,
            location: true,
            purchaseDate: true,
            warrantyEndDate: true,
          },
        },
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        issuedByUser: {
          select: { id: true, username: true },
        },
        createdByUser: {
          select: { id: true, username: true },
        },
        updatedByUser: {
          select: { id: true, username: true },
        },
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

  async returnAsset(
    id: number,
    returnAssignmentDto: ReturnAssignmentDto,
    userId: number,
  ) {
    try {
      // Find the active assignment
      const assignment = await this.prisma.assetIssue.findUnique({
        where: { id },
        include: {
          asset: { select: { id: true, status: true } },
        },
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
            returnDate: new Date(returnAssignmentDto.returnDate), // Business date
            returnTimestamp: new Date(), // Audit timestamp (current UTC time)
            returnCondition: returnAssignmentDto.returnCondition as any,
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
              },
            },
            employee: {
              select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            issuedByUser: {
              select: { id: true, username: true },
            },
            updatedByUser: {
              select: { id: true, username: true },
            },
          },
        });

        // Update asset status back to NON_ASSIGNED and condition if needed
        const assetUpdateData: any = {
          status: 'NON_ASSIGNED',
          updatedBy: userId,
        };

        // Update asset condition based on return condition
        assetUpdateData.condition = returnAssignmentDto.returnCondition;

        await prisma.asset.update({
          where: { id: assignment.assetId },
          data: assetUpdateData,
        });

        // Log asset collection event
        await prisma.assetEvent.create({
          data: {
            assetId: assignment.assetId,
            eventType: AssetEventType.ASSET_COLLECTED,
            eventDate: new Date(),
            performedBy: userId,
            metadata: {
              assignmentId: updatedAssignment.id,
              employeeId: updatedAssignment.employee.employeeId,
              employeeName: `${updatedAssignment.employee.firstName} ${updatedAssignment.employee.lastName}`,
              employeeEmail: updatedAssignment.employee.email,
              collectedBy: updatedAssignment.updatedByUser.username,
              returnDate: updatedAssignment.returnDate,
              returnCondition: updatedAssignment.returnCondition,
              returnReason: updatedAssignment.returnReason,
              notes: updatedAssignment.notes,
              previousStatus: 'ASSIGNED',
              newStatus: 'NON_ASSIGNED',
              previousCondition: updatedAssignment.asset.condition,
              newCondition: returnAssignmentDto.returnCondition,
              collectedVia: 'CollectAssetView',
            },
          },
        });

        return updatedAssignment;
      });

      await this.auditService.log({
        tableName: 'asset_issues',
        recordId: result.id,
        action: AuditAction.UPDATE,
        userId,
        entityLabel: `${result.asset.assetId} ← ${result.employee.firstName} ${result.employee.lastName}`,
        summary: `Collected asset ${result.asset.assetId} from ${result.employee.firstName} ${result.employee.lastName}`,
        changes: [
          {
            field: 'returnCondition',
            label: 'Return Condition',
            oldValue: assignment.issueCondition,
            newValue: returnAssignmentDto.returnCondition,
          },
          {
            field: 'returnReason',
            label: 'Return Reason',
            oldValue: null,
            newValue: returnAssignmentDto.returnReason,
          },
        ],
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
}

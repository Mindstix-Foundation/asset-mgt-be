import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateDesignationDto, DesignationQueryDto } from './dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class DesignationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    createDesignationDto: CreateDesignationDto,
    userId: number,
    tenantId: number,
  ) {
    try {
      const existing = await this.prisma.designation.findFirst({
        where: {
          tenantId,
          name: {
            equals: createDesignationDto.name,
            mode: 'insensitive',
          },
        },
      });

      if (existing) {
        throw new ConflictException('Designation name already exists');
      }

      const capitalizedName =
        createDesignationDto.name.charAt(0).toUpperCase() +
        createDesignationDto.name.slice(1);

      const designation = await this.prisma.designation.create({
        data: {
          tenantId,
          name: capitalizedName,
          description: createDesignationDto.description,
          createdBy: userId,
          updatedBy: userId,
        },
        include: {
          createdByUser: {
            select: { id: true, username: true },
          },
          _count: {
            select: { employees: true },
          },
        },
      });

      await this.auditService.log({
        tableName: 'designations',
        recordId: designation.id,
        action: AuditAction.INSERT,
        userId,
        tenantId,
        entityLabel: designation.name,
        summary: `Created designation ${designation.name}`,
        after: {
          name: designation.name,
          description: designation.description,
        },
      });

      return {
        message: 'Designation created successfully',
        data: { designation },
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      if ((error as any)?.code === 'P2002') {
        throw new ConflictException('Designation name already exists');
      }
      throw error;
    }
  }

  async findAll(queryDto: DesignationQueryDto, tenantId: number) {
    const {
      page = 1,
      limit = 50,
      search,
      sortBy = 'name',
      sortOrder = 'asc',
    } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const orderBy = { [sortBy]: sortOrder } as any;

    const [designations, totalCount] = await Promise.all([
      this.prisma.designation.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          createdByUser: {
            select: { id: true, username: true },
          },
          _count: {
            select: { employees: true },
          },
        },
      }),
      this.prisma.designation.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      message: 'Designations retrieved successfully',
      data: {
        designations,
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

  async findOne(id: number, tenantId: number) {
    const designation = await this.prisma.designation.findFirst({
      where: { id, tenantId },
      include: {
        createdByUser: {
          select: { id: true, username: true },
        },
        updatedByUser: {
          select: { id: true, username: true },
        },
        _count: {
          select: { employees: true },
        },
      },
    });

    if (!designation) {
      throw new NotFoundException('Designation not found');
    }

    return {
      message: 'Designation retrieved successfully',
      data: { designation },
    };
  }

  async remove(id: number, userId: number, tenantId: number) {
    const designation = await this.prisma.designation.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: { employees: true },
        },
      },
    });

    if (!designation) {
      throw new NotFoundException('Designation not found');
    }

    if (designation._count.employees > 0) {
      throw new BadRequestException(
        'Cannot delete designation that is already assigned to employees',
      );
    }

    await this.prisma.designation.delete({ where: { id } });

    await this.auditService.log({
      tableName: 'designations',
      recordId: id,
      action: AuditAction.DELETE,
      userId,
      tenantId,
      entityLabel: designation.name,
      summary: `Deleted designation ${designation.name}`,
      before: { name: designation.name },
    });

    return {
      message: 'Designation deleted successfully',
    };
  }
}

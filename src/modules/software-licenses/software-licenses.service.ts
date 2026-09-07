import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, Prisma } from '@prisma/client';
import {
  CreateSoftwareLicenseDto,
  UpdateSoftwareLicenseDto,
  SoftwareLicenseQueryDto,
} from './dto';

const EXPIRING_SOON_DAYS = 30;

const assignedToSelect = {
  id: true,
  employeeId: true,
  firstName: true,
  lastName: true,
  email: true,
  designation: { select: { id: true, name: true } },
} as const;

@Injectable()
export class SoftwareLicensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private mapLicense(license: any) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(license.expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysUntilExpiry = Math.ceil(
      (expiry.getTime() - today.getTime()) / msPerDay,
    );

    let expiryStatus: 'active' | 'expiring' | 'expired' = 'active';
    if (daysUntilExpiry < 0) expiryStatus = 'expired';
    else if (daysUntilExpiry <= EXPIRING_SOON_DAYS) expiryStatus = 'expiring';

    return {
      ...license,
      purchaseCost: license.purchaseCost
        ? Number(license.purchaseCost)
        : null,
      daysUntilExpiry,
      expiryStatus,
    };
  }

  private async assertAssigneeInTenant(
    assignedToId: number,
    tenantId: number,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: assignedToId,
        tenantId,
        status: 'ACTIVE',
      },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!employee) {
      throw new BadRequestException(
        'Assigned employee not found or inactive in this organization',
      );
    }

    return employee;
  }

  async create(
    dto: CreateSoftwareLicenseDto,
    userId: number,
    tenantId: number,
  ) {
    if (dto.startDate && dto.expiryDate) {
      if (new Date(dto.expiryDate) < new Date(dto.startDate)) {
        throw new BadRequestException(
          'Expiry date cannot be before start date',
        );
      }
    }

    const assignee = await this.assertAssigneeInTenant(
      dto.assignedToId,
      tenantId,
    );

    const license = await this.prisma.softwareLicense.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        vendorName: dto.vendorName?.trim() || null,
        licenseKey: dto.licenseKey?.trim() || null,
        seats: dto.seats ?? null,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        purchaseCost: dto.purchaseCost ?? null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        expiryDate: new Date(dto.expiryDate),
        assignedToId: dto.assignedToId,
        notes: dto.notes?.trim() || null,
        isActive: dto.isActive ?? true,
        createdBy: userId,
        updatedBy: userId,
      },
      include: { assignedTo: { select: assignedToSelect } },
    });

    await this.auditService.log({
      tableName: 'software_licenses',
      recordId: license.id,
      action: AuditAction.INSERT,
      userId,
      tenantId,
      entityLabel: license.name,
      summary: `Created software license ${license.name} assigned to ${assignee.firstName} ${assignee.lastName}`,
      after: {
        name: license.name,
        expiryDate: license.expiryDate,
        assignedToId: license.assignedToId,
      },
    });

    return {
      message: 'Software license created successfully',
      data: { license: this.mapLicense(license) },
    };
  }

  async findAll(query: SoftwareLicenseQueryDto, tenantId: number) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      sortBy = 'expiryDate',
      sortOrder = 'asc',
    } = query;
    const skip = (page - 1) * limit;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const soon = new Date(today);
    soon.setDate(soon.getDate() + EXPIRING_SOON_DAYS);

    const where: Prisma.SoftwareLicenseWhereInput = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { vendorName: { contains: search, mode: 'insensitive' } },
        { licenseKey: { contains: search, mode: 'insensitive' } },
        {
          assignedTo: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { employeeId: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    if (status === 'expired') {
      where.expiryDate = { lt: today };
      where.isActive = true;
    } else if (status === 'expiring') {
      where.expiryDate = { gte: today, lte: soon };
      where.isActive = true;
    } else if (status === 'active') {
      where.expiryDate = { gt: soon };
      where.isActive = true;
    }

    const orderBy =
      sortBy === 'assignedTo'
        ? { assignedTo: { firstName: sortOrder } }
        : ({ [sortBy]: sortOrder } as any);

    const [licenses, totalCount] = await Promise.all([
      this.prisma.softwareLicense.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { assignedTo: { select: assignedToSelect } },
      }),
      this.prisma.softwareLicense.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    return {
      message: 'Software licenses retrieved successfully',
      data: {
        licenses: licenses.map((l) => this.mapLicense(l)),
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
    const license = await this.prisma.softwareLicense.findFirst({
      where: { id, tenantId },
      include: { assignedTo: { select: assignedToSelect } },
    });
    if (!license) {
      throw new NotFoundException('Software license not found');
    }
    return {
      message: 'Software license retrieved successfully',
      data: { license: this.mapLicense(license) },
    };
  }

  async update(
    id: number,
    dto: UpdateSoftwareLicenseDto,
    userId: number,
    tenantId: number,
  ) {
    const existing = await this.prisma.softwareLicense.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Software license not found');
    }

    const startDate = dto.startDate
      ? new Date(dto.startDate)
      : existing.startDate;
    const expiryDate = dto.expiryDate
      ? new Date(dto.expiryDate)
      : existing.expiryDate;
    if (startDate && expiryDate && expiryDate < startDate) {
      throw new BadRequestException(
        'Expiry date cannot be before start date',
      );
    }

    if (dto.assignedToId !== undefined) {
      await this.assertAssigneeInTenant(dto.assignedToId, tenantId);
    }

    const license = await this.prisma.softwareLicense.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.vendorName !== undefined
          ? { vendorName: dto.vendorName?.trim() || null }
          : {}),
        ...(dto.licenseKey !== undefined
          ? { licenseKey: dto.licenseKey?.trim() || null }
          : {}),
        ...(dto.seats !== undefined ? { seats: dto.seats } : {}),
        ...(dto.purchaseDate !== undefined
          ? {
              purchaseDate: dto.purchaseDate
                ? new Date(dto.purchaseDate)
                : null,
            }
          : {}),
        ...(dto.purchaseCost !== undefined
          ? { purchaseCost: dto.purchaseCost }
          : {}),
        ...(dto.startDate !== undefined
          ? { startDate: dto.startDate ? new Date(dto.startDate) : null }
          : {}),
        ...(dto.expiryDate !== undefined
          ? { expiryDate: new Date(dto.expiryDate) }
          : {}),
        ...(dto.assignedToId !== undefined
          ? { assignedToId: dto.assignedToId }
          : {}),
        ...(dto.notes !== undefined
          ? { notes: dto.notes?.trim() || null }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedBy: userId,
      },
      include: { assignedTo: { select: assignedToSelect } },
    });

    await this.auditService.log({
      tableName: 'software_licenses',
      recordId: id,
      action: AuditAction.UPDATE,
      userId,
      tenantId,
      entityLabel: license.name,
      summary: `Updated software license ${license.name}`,
      before: {
        name: existing.name,
        expiryDate: existing.expiryDate,
        assignedToId: existing.assignedToId,
      },
      after: {
        name: license.name,
        expiryDate: license.expiryDate,
        assignedToId: license.assignedToId,
      },
    });

    return {
      message: 'Software license updated successfully',
      data: { license: this.mapLicense(license) },
    };
  }

  async remove(id: number, userId: number, tenantId: number) {
    const existing = await this.prisma.softwareLicense.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Software license not found');
    }

    await this.prisma.softwareLicense.delete({ where: { id } });

    await this.auditService.log({
      tableName: 'software_licenses',
      recordId: id,
      action: AuditAction.DELETE,
      userId,
      tenantId,
      entityLabel: existing.name,
      summary: `Deleted software license ${existing.name}`,
      before: { name: existing.name },
    });

    return { message: 'Software license deleted successfully' };
  }
}

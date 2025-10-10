import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { MaintenanceQueryDto } from './dto/maintenance-query.dto';
import { MaintenanceExportQueryDto } from './dto/maintenance-export-query.dto';
import {
  MaintenanceStatus,
  MaintenanceTypeEnum,
  Prisma,
  AssetEventType,
} from '@prisma/client';
import * as XLSX from 'xlsx';

type MaintenanceEventRow = {
  id: number;
  description: string;
  maintenanceTypeName: string;
  status: string;
  date: Date;
  scheduledDateOnly: string;
  actualCost?: number | null;
  estimatedCost?: number | null;
  completionNotes?: string | null;
  cancellationNotes?: string | null;
  scheduledDate?: Date | null;
  actualStartDate?: Date | null;
  actualCompletionDate?: Date | null;
  cancellationDate?: Date | null;
};

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createMaintenanceDto: CreateMaintenanceDto, userId: number) {
    try {
      const { assetId, scheduledDate } = createMaintenanceDto;

      // Check if asset exists
      const asset = await this.prisma.asset.findUnique({
        where: { id: assetId },
      });

      if (!asset) {
        throw new NotFoundException('Asset not found');
      }

      // Check if asset is assigned - only allow maintenance for available assets
      if (asset.status === 'ASSIGNED') {
        throw new BadRequestException(
          'Cannot schedule maintenance for assigned assets. Asset must be available.',
        );
      }

      // Check if asset is available for maintenance on the scheduled date
      const existingMaintenance =
        await this.prisma.maintenanceSchedule.findFirst({
          where: {
            assetId,
            scheduledDate: new Date(scheduledDate),
            status: {
              in: [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS],
            },
          },
        });

      if (existingMaintenance) {
        throw new ConflictException(
          'Asset is already scheduled for maintenance on this date',
        );
      }

      // vendor removed from maintenance

      const isToday = (() => {
        const todayStr = new Date().toISOString().split('T')[0];
        return todayStr === scheduledDate;
      })();

      const maintenanceData: any = {
        maintenanceType: createMaintenanceDto.maintenanceType,
        description: createMaintenanceDto.description,
        frequencyDays: createMaintenanceDto.frequencyDays || null,
        asset: {
          connect: { id: assetId },
        },
        createdByUser: {
          connect: { id: userId },
        },
        updatedByUser: {
          connect: { id: userId },
        },
        scheduledDate: new Date(scheduledDate),
        estimatedCost: createMaintenanceDto.estimatedCost
          ? new Prisma.Decimal(createMaintenanceDto.estimatedCost)
          : null,
        status: isToday
          ? MaintenanceStatus.IN_PROGRESS
          : MaintenanceStatus.SCHEDULED,
        actualStartDate: isToday ? new Date() : null,
      };

      // vendor removed from maintenance

      // Transaction: create maintenance and set asset status
      const maintenance = await this.prisma.$transaction(async (tx) => {
        const created = await tx.maintenanceSchedule.create({
          data: maintenanceData,
          include: {
            asset: {
              select: {
                id: true,
                assetId: true,
                assetType: { select: { name: true } },
                brand: { select: { name: true } },
                model: { select: { name: true } },
              },
            },
          },
        });

        // Immediately mark the asset as in maintenance
        await tx.asset.update({
          where: { id: assetId },
          data: { status: 'IN_MAINTENANCE' },
        });

        // Log MAINTENANCE_SCHEDULED event to asset history
        await tx.assetEvent.create({
          data: {
            assetId: assetId,
            eventType: AssetEventType.MAINTENANCE_SCHEDULED,
            eventDate: new Date(),
            performedBy: userId,
            metadata: {
              maintenanceId: created.id,
              maintenanceType: created.maintenanceType,
              scheduledDate: created.scheduledDate.toISOString().split('T')[0], // yyyy-mm-dd
              estimatedCost: created.estimatedCost,
              description: created.description,
              frequencyDays: created.frequencyDays,
              assetId: created.asset.assetId,
              assetType: created.asset.assetType?.name,
              brand: created.asset.brand?.name,
              model: created.asset.model?.name,
              previousStatus: asset.status,
              newStatus: 'IN_MAINTENANCE',
              scheduledVia: 'ScheduleMaintenanceView',
            },
          },
        });

        return created;
      });

      return {
        message: 'Maintenance scheduled successfully',
        data: { maintenance: this.formatMaintenanceResponse(maintenance) },
      };
    } catch (error) {
      console.error('❌ Error in MaintenanceService.create:', {
        error: error.message,
        stack: error.stack,
        createMaintenanceDto,
        userId,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async findAll(query: MaintenanceQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      assetId,
      maintenanceType,
      scheduledDateFrom,
      scheduledDateTo,
      assetType,
      sortBy = 'scheduledDate',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // First, get the latest maintenance record for each asset
    const latestMaintenanceSubquery = `
      SELECT DISTINCT ON (asset_id) 
        id, asset_id, maintenance_type, scheduled_date, frequency_days, description,
        estimated_cost, status, actual_start_date, actual_completion_date,
        actual_cost, completion_notes, cancellation_date, cancellation_reason,
        cancellation_notes, is_active, created_by, created_at, updated_by, updated_at
      FROM maintenance_schedules 
      WHERE is_active = true
      ORDER BY asset_id, created_at DESC
    `;

    // Build where conditions for the subquery results
    const conditions: string[] = ['m.is_active = true'];
    const params: any[] = [];

    if (search) {
      conditions.push(`(
        m.description ILIKE $${params.length + 1} OR 
        a.asset_id ILIKE $${params.length + 1} OR 
        m.completion_notes ILIKE $${params.length + 1}
      )`);
      params.push(`%${search}%`);
    }

    if (status) {
      // Compare as text to avoid enum mismatch issues
      conditions.push(`UPPER(m.status::text) = UPPER($${params.length + 1})`);
      params.push(status);
    }

    if (assetId) {
      conditions.push(`m.asset_id = $${params.length + 1}`);
      params.push(assetId);
    }

    if (maintenanceType) {
      // Compare as text to avoid enum mismatch issues
      conditions.push(
        `UPPER(m.maintenance_type::text) = UPPER($${params.length + 1})`,
      );
      params.push(maintenanceType);
    }

    // vendor filters removed

    if (scheduledDateFrom) {
      conditions.push(`m.scheduled_date >= $${params.length + 1}`);
      params.push(new Date(scheduledDateFrom));
    }

    if (scheduledDateTo) {
      conditions.push(`m.scheduled_date <= $${params.length + 1}`);
      params.push(new Date(scheduledDateTo));
    }

    if (assetType) {
      conditions.push(`at.name ILIKE $${params.length + 1}`);
      params.push(`%${assetType}%`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build order by clause
    let orderByClause = 'ORDER BY m.scheduled_date DESC';
    switch (sortBy) {
      case 'scheduledDate':
        orderByClause = `ORDER BY m.scheduled_date ${sortOrder.toUpperCase()}`;
        break;
      case 'createdAt':
        orderByClause = `ORDER BY m.created_at ${sortOrder.toUpperCase()}`;
        break;
      case 'status':
        orderByClause = `ORDER BY m.status ${sortOrder.toUpperCase()}`;
        break;
      case 'maintenanceType':
        orderByClause = `ORDER BY m.maintenance_type ${sortOrder.toUpperCase()}`;
        break;
      case 'estimatedCost':
        orderByClause = `ORDER BY m.estimated_cost ${sortOrder.toUpperCase()}`;
        break;
    }

    // Get paginated results
    const maintenanceQuery = `
      WITH latest_maintenance AS (${latestMaintenanceSubquery})
      SELECT 
        m.*,
        a.asset_id as asset_asset_id,
        at.name as asset_type_name,
        b.name as brand_name,
        mo.name as model_name
      FROM latest_maintenance m
      LEFT JOIN assets a ON m.asset_id = a.id
      LEFT JOIN asset_types at ON a.asset_type_id = at.id
      LEFT JOIN brands b ON a.brand_id = b.id
      LEFT JOIN models mo ON a.model_id = mo.id
      
      ${whereClause}
      ${orderByClause}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, skip);

    // Get count
    const countQuery = `
      WITH latest_maintenance AS (${latestMaintenanceSubquery})
      SELECT COUNT(*) as total
      FROM latest_maintenance m
      LEFT JOIN assets a ON m.asset_id = a.id
      LEFT JOIN asset_types at ON a.asset_type_id = at.id
      ${whereClause}
    `;

    const countParams = params.slice(0, -2); // Remove limit and offset for count query

    const [maintenanceResults, countResult] = await Promise.all([
      this.prisma.$queryRawUnsafe(maintenanceQuery, ...params),
      this.prisma.$queryRawUnsafe(countQuery, ...countParams),
    ]);

    const total = Number((countResult as any)[0]?.total || 0);
    const totalPages = Math.ceil(total / limit);

    // Format the results
    const maintenances = (maintenanceResults as any[]).map((row) => {
      // Determine the relevant date based on status
      let relevantDate = null;
      let dateType = '';
      
      switch (row.status?.toUpperCase()) {
        case 'CANCELLED':
          relevantDate = row.cancellation_date;
          dateType = 'cancellation';
          break;
        case 'COMPLETED':
          relevantDate = row.actual_completion_date;
          dateType = 'completion';
          break;
        case 'IN_PROGRESS':
        case 'SCHEDULED':
        default:
          relevantDate = row.scheduled_date;
          dateType = 'scheduled';
          break;
      }

      return {
        id: row.id.toString(),
        assetId: row.asset_asset_id,
        assetName: `${row.asset_type_name} - ${row.brand_name} ${row.model_name}`,
        assetType: row.asset_type_name,
        assetBrand: row.brand_name,
        assetModel: row.model_name,
        maintenanceTypeId: row.maintenance_type,
        maintenanceTypeName: row.maintenance_type,
        status: row.status,
        assignedTo: 'Internal Team',
        relevantDate: relevantDate,
        dateType: dateType,
        estimatedCost: row.estimated_cost ? Number(row.estimated_cost) : null,
        actualCost: row.actual_cost ? Number(row.actual_cost) : null,
        description: row.description,
        completionNotes: row.completion_notes,
        cancellationNotes: row.cancellation_notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    return {
      message: 'Latest maintenance records retrieved successfully',
      data: {
        maintenances,

        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      },
    };
  }

  async findOne(id: number) {
    const maintenance = await this.prisma.maintenanceSchedule.findUnique({
      where: { id },
      include: {
        asset: {
          select: {
            id: true,
            assetId: true,
            assetType: { select: { name: true } },
            brand: { select: { name: true } },
            model: { select: { name: true } },
          },
        },
      },
    });

    if (!maintenance) {
      throw new NotFoundException('Maintenance not found');
    }

    return {
      message: 'Maintenance retrieved successfully',
      data: { maintenance: this.formatMaintenanceResponse(maintenance) },
    };
  }

  async update(
    id: number,
    updateMaintenanceDto: UpdateMaintenanceDto,
    userId: number,
  ) {
    const existingMaintenance =
      await this.prisma.maintenanceSchedule.findUnique({
        where: { id },
      });

    if (!existingMaintenance) {
      throw new NotFoundException('Maintenance not found');
    }

    await this.assertNoScheduleConflictOnUpdate(
      id,
      existingMaintenance,
      updateMaintenanceDto,
    );

    const { updateData, shouldStartToday } = this.buildUpdateData(
      updateMaintenanceDto,
      userId,
    );

    const maintenance = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceSchedule.update({
        where: { id },
        data: updateData,
        include: {
          asset: {
            select: {
              id: true,
              assetId: true,
              assetType: { select: { name: true } },
              brand: { select: { name: true } },
              model: { select: { name: true } },
            },
          },
        },
      });

      // If starting today, ensure the asset status is IN_MAINTENANCE
      if (shouldStartToday) {
        await tx.asset.update({
          where: { id: updated.assetId },
          data: { status: 'IN_MAINTENANCE' },
        });
      }

      // Log MAINTENANCE_UPDATED event to asset history
      await tx.assetEvent.create({
        data: {
          assetId: updated.assetId,
          eventType: AssetEventType.MAINTENANCE_UPDATED,
          eventDate: new Date(),
          performedBy: userId,
          metadata: {
            maintenanceId: updated.id,
            maintenanceType: updated.maintenanceType,
            scheduledDate: updated.scheduledDate.toISOString().split('T')[0], // Format as yyyy-mm-dd
            estimatedCost: updated.estimatedCost,
            description: updated.description,
            frequencyDays: updated.frequencyDays,
            assetId: updated.asset.assetId,
            assetType: updated.asset.assetType.name,
            brand: updated.asset.brand.name,
            model: updated.asset.model.name,
            status: updated.status,
            changes: Object.keys(updateMaintenanceDto)
              .filter((key) => {
                // Only include meaningful fields that can be updated
                const meaningfulFields = [
                  'maintenanceType',
                  'scheduledDate',
                  'estimatedCost',
                  'description',
                  'frequencyDays',
                ];
                return meaningfulFields.includes(key);
              })
              .filter((key) => {
                // Only include fields that actually changed
                const oldValue = this.formatValueForComparison(existingMaintenance[key]);
                const newValue = this.formatValueForComparison(updateMaintenanceDto[key]);

                return oldValue !== newValue;
              })
              .map((key) => {
                // Format values properly for display
                const oldValue = this.formatValueForDisplay(
                  existingMaintenance[key],
                );
                const newValue = this.formatValueForDisplay(
                  updateMaintenanceDto[key],
                );

                return {
                  fieldName: key,
                  oldValue: oldValue,
                  newValue: newValue,
                };
              }),
          },
        },
      });

      return updated;
    });

    return {
      message: 'Maintenance updated successfully',
      data: { maintenance: this.formatMaintenanceResponse(maintenance) },
    };
  }

  private async assertNoScheduleConflictOnUpdate(
    id: number,
    existing: any,
    dto: UpdateMaintenanceDto,
  ): Promise<void> {
    if (!dto.assetId && !dto.scheduledDate) return;
    const assetId = dto.assetId || existing.assetId;
    const scheduledDateStr =
      dto.scheduledDate || existing.scheduledDate.toISOString().split('T')[0];
    const conflictingMaintenance =
      await this.prisma.maintenanceSchedule.findFirst({
        where: {
          id: { not: id },
          assetId,
          scheduledDate: new Date(scheduledDateStr),
          status: {
            in: [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS],
          },
        },
      });
    if (conflictingMaintenance) {
      throw new ConflictException(
        'Asset is already scheduled for maintenance on this date',
      );
    }
  }

  private buildUpdateData(
    dto: UpdateMaintenanceDto,
    userId: number,
  ): { updateData: any; shouldStartToday: boolean } {
    const updateData: any = { ...dto, updatedBy: userId };

    if (dto.scheduledDate)
      updateData.scheduledDate = new Date(dto.scheduledDate);
    if (dto.actualStartDate)
      updateData.actualStartDate = new Date(dto.actualStartDate);
    if (dto.actualCompletionDate)
      updateData.actualCompletionDate = new Date(dto.actualCompletionDate);
    if (dto.cancellationDate)
      updateData.cancellationDate = new Date(dto.cancellationDate);

    if (dto.estimatedCost !== undefined) {
      updateData.estimatedCost = dto.estimatedCost
        ? new Prisma.Decimal(dto.estimatedCost)
        : null;
    }
    if (dto.actualCost !== undefined) {
      updateData.actualCost = dto.actualCost
        ? new Prisma.Decimal(dto.actualCost)
        : null;
    }

    let shouldStartToday = false;
    if (dto.scheduledDate) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (dto.scheduledDate === todayStr) {
        shouldStartToday = true;
        updateData.status = MaintenanceStatus.IN_PROGRESS;
        updateData.actualStartDate = new Date();
      }
    }

    return { updateData, shouldStartToday };
  }

  async remove(id: number, userId: number) {
    const maintenance = await this.prisma.maintenanceSchedule.findUnique({
      where: { id },
      include: {
        asset: {
          select: {
            id: true,
            assetId: true,
            status: true,
            assetType: { select: { name: true } },
            brand: { select: { name: true } },
            model: { select: { name: true } },
          },
        },
      },
    });

    if (!maintenance) {
      throw new NotFoundException('Maintenance not found');
    }

    // Soft delete by updating status within transaction
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceSchedule.update({
        where: { id },
        data: {
          status: MaintenanceStatus.CANCELLED,
          cancellationDate: new Date(),
          cancellationReason: 'Deleted by user',
          updatedBy: userId,
        },
      });

      // If there are no other active SCHEDULED/IN_PROGRESS maintenances for this asset, set it AVAILABLE
      const stillActive = await tx.maintenanceSchedule.count({
        where: {
          isActive: true,
          assetId: maintenance.assetId,
          status: {
            in: [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS],
          },
        },
      });

      let newAssetStatus = maintenance.asset.status;
      if (stillActive === 0) {
        await tx.asset.update({
          where: { id: maintenance.assetId },
          data: { status: 'AVAILABLE' },
        });
        newAssetStatus = 'AVAILABLE';
      }

      // Log MAINTENANCE_CANCELLED event to asset history
      await tx.assetEvent.create({
        data: {
          assetId: maintenance.assetId,
          eventType: AssetEventType.MAINTENANCE_CANCELLED,
          eventDate: new Date(),
          performedBy: userId,
          metadata: {
            maintenanceId: updated.id,
            maintenanceType: maintenance.maintenanceType,
            scheduledDate: maintenance.scheduledDate
              .toISOString()
              .split('T')[0], // yyyy-mm-dd
            cancellationDate: new Date().toISOString().split('T')[0], // yyyy-mm-dd
            estimatedCost: maintenance.estimatedCost,
            description: maintenance.description,
            cancellationReason: 'Deleted by user',
            assetId: maintenance.asset.assetId,
            assetType: maintenance.asset.assetType?.name,
            brand: maintenance.asset.brand?.name,
            model: maintenance.asset.model?.name,
            previousStatus:
              maintenance.status === MaintenanceStatus.IN_PROGRESS
                ? 'IN_MAINTENANCE'
                : maintenance.asset.status,
            newStatus: newAssetStatus,
          },
        },
      });

      return updated;
    });

    return {
      message: 'Maintenance deleted successfully',
    };
  }

  async completeMaintenance(
    id: number,
    actualCost: number,
    completionNotes?: string,
    userId?: number,
  ) {
    const maintenance = await this.prisma.maintenanceSchedule.findUnique({
      where: { id },
    });

    if (!maintenance) {
      throw new NotFoundException('Maintenance not found');
    }

    if (
      maintenance.status !== MaintenanceStatus.IN_PROGRESS &&
      maintenance.status !== MaintenanceStatus.SCHEDULED
    ) {
      throw new BadRequestException(
        'Only scheduled or in-progress maintenance can be completed',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceSchedule.update({
        where: { id },
        data: {
          status: MaintenanceStatus.COMPLETED,
          actualCompletionDate: new Date(),
          actualCost: new Prisma.Decimal(actualCost),
          completionNotes,
          updatedBy: userId || maintenance.updatedBy,
        },
        include: {
          asset: {
            select: {
              id: true,
              assetId: true,
              status: true,
              assetType: { select: { name: true } },
              brand: { select: { name: true } },
              model: { select: { name: true } },
            },
          },
        },
      });

      // If no other active SCHEDULED/IN_PROGRESS maintenances exist for the asset, mark it AVAILABLE
      const stillActive = await tx.maintenanceSchedule.count({
        where: {
          isActive: true,
          assetId: updated.assetId,
          status: {
            in: [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS],
          },
        },
      });

      let newAssetStatus = updated.asset.status;
      if (stillActive === 0) {
        await tx.asset.update({
          where: { id: updated.assetId },
          data: { status: 'AVAILABLE' },
        });
        newAssetStatus = 'AVAILABLE';
      }

      // Log MAINTENANCE_COMPLETED event to asset history
      await tx.assetEvent.create({
        data: {
          assetId: updated.assetId,
          eventType: AssetEventType.MAINTENANCE_COMPLETED,
          eventDate: new Date(),
          performedBy: userId || maintenance.updatedBy,
          metadata: {
            maintenanceId: updated.id,
            maintenanceType: updated.maintenanceType,
            scheduledDate: updated.scheduledDate.toISOString().split('T')[0], // yyyy-mm-dd
            actualCompletionDate:
              updated.actualCompletionDate?.toISOString().split('T')[0] || null, // yyyy-mm-dd
            estimatedCost: updated.estimatedCost,
            actualCost: updated.actualCost,
            description: updated.description,
            completionNotes: updated.completionNotes,
            assetId: updated.asset.assetId,
            assetType: updated.asset.assetType?.name,
            brand: updated.asset.brand?.name,
            model: updated.asset.model?.name,
            previousStatus: 'IN_MAINTENANCE',
            newStatus: newAssetStatus,
          },
        },
      });

      return updated;
    });

    return {
      message: 'Maintenance completed successfully',
      data: { maintenance: this.formatMaintenanceResponse(updated) },
    };
  }

  async cancelMaintenance(
    id: number,
    _cancelDate: string | undefined,
    cancelNotes: string,
    userId?: number,
  ) {
    const maintenance = await this.prisma.maintenanceSchedule.findUnique({
      where: { id },
    });

    if (!maintenance) {
      throw new NotFoundException('Maintenance not found');
    }

    if (
      maintenance.status === MaintenanceStatus.COMPLETED ||
      maintenance.status === MaintenanceStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Cannot cancel completed or already cancelled maintenance',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceSchedule.update({
        where: { id },
        data: {
          status: MaintenanceStatus.CANCELLED,
          // Default to now; ignore client-sent date per new requirement
          cancellationDate: new Date(),
          cancellationNotes: cancelNotes,
          updatedBy: userId || maintenance.updatedBy,
        },
        include: {
          asset: {
            select: {
              id: true,
              assetId: true,
              status: true,
              assetType: { select: { name: true } },
              brand: { select: { name: true } },
              model: { select: { name: true } },
            },
          },
        },
      });

      // If there are no other active SCHEDULED/IN_PROGRESS maintenances for this asset, set it AVAILABLE
      const stillActive = await tx.maintenanceSchedule.count({
        where: {
          isActive: true,
          assetId: updated.assetId,
          status: {
            in: [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS],
          },
        },
      });

      let newAssetStatus = updated.asset.status;
      if (stillActive === 0) {
        await tx.asset.update({
          where: { id: updated.assetId },
          data: { status: 'AVAILABLE' },
        });
        newAssetStatus = 'AVAILABLE';
      }

      // Log MAINTENANCE_CANCELLED event to asset history
      await tx.assetEvent.create({
        data: {
          assetId: updated.assetId,
          eventType: AssetEventType.MAINTENANCE_CANCELLED,
          eventDate: new Date(),
          performedBy: userId || maintenance.updatedBy,
          metadata: {
            maintenanceId: updated.id,
            maintenanceType: updated.maintenanceType,
            scheduledDate: updated.scheduledDate.toISOString().split('T')[0], // yyyy-mm-dd
            cancellationDate:
              updated.cancellationDate?.toISOString().split('T')[0] || null, // yyyy-mm-dd
            estimatedCost: updated.estimatedCost,
            description: updated.description,
            cancellationNotes: updated.cancellationNotes,
            assetId: updated.asset.assetId,
            assetType: updated.asset.assetType?.name,
            brand: updated.asset.brand?.name,
            model: updated.asset.model?.name,
            previousStatus: 'IN_MAINTENANCE',
            newStatus: newAssetStatus,
          },
        },
      });

      return updated;
    });

    return {
      message: 'Maintenance cancelled successfully',
      data: { maintenance: this.formatMaintenanceResponse(updated) },
    };
  }

  async checkAssetAvailability(
    assetId: number,
    scheduledDate: string,
    excludeMaintenanceId?: number,
  ) {
    const where: Prisma.MaintenanceScheduleWhereInput = {
      assetId,
      scheduledDate: new Date(scheduledDate),
      status: {
        in: [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS],
      },
    };

    if (excludeMaintenanceId) {
      where.id = { not: excludeMaintenanceId };
    }

    const existingMaintenance = await this.prisma.maintenanceSchedule.findFirst(
      {
        where,
      },
    );

    return {
      message: 'Asset availability checked',
      data: { available: !existingMaintenance },
    };
  }

  async getMaintenanceHistory(assetId: string) {
    try {
      // First try to find asset by assetId (string) or by id (if it's a number)
      let asset;
      const isNumeric = /^\d+$/.test(assetId);

      if (isNumeric) {
        // If it's a number, search by internal ID
        asset = await this.prisma.asset.findUnique({
          where: { id: Number.parseInt(assetId) },
          select: {
            id: true,
            assetId: true,
            assetType: { select: { name: true } },
            brand: { select: { name: true } },
            model: { select: { name: true } },
          },
        });
      } else {
        // If it's a string, search by assetId
        asset = await this.prisma.asset.findUnique({
          where: { assetId: assetId },
          select: {
            id: true,
            assetId: true,
            assetType: { select: { name: true } },
            brand: { select: { name: true } },
            model: { select: { name: true } },
          },
        });
      }

      if (!asset) {
        throw new NotFoundException('Asset not found');
      }

      // Get all maintenance records for this asset, ordered by creation date descending
      const maintenanceHistory = await this.prisma.maintenanceSchedule.findMany(
        {
          where: {
            assetId: asset.id, // Use the internal asset ID
            isActive: true,
          },
          include: {
            asset: {
              select: {
                id: true,
                assetId: true,
                assetType: { select: { name: true } },
                brand: { select: { name: true } },
                model: { select: { name: true } },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      );

      return {
        message: 'Maintenance history retrieved successfully',
        data: {
          asset: {
            id: asset.id,
            assetId: asset.assetId,
            name: `${asset.assetType?.name} - ${asset.brand?.name} ${asset.model?.name}`,
          },
          maintenanceHistory: maintenanceHistory.map(
            this.formatMaintenanceResponse,
          ),
          totalRecords: maintenanceHistory.length,
        },
      };
    } catch (error) {
      console.error('❌ Error in MaintenanceService.getMaintenanceHistory:', {
        error: error.message,
        assetId,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async getMaintenanceTypes() {
    const types = Object.values(MaintenanceTypeEnum).map((type) => ({
      id: type,
      name: type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' '),
      description: this.getMaintenanceTypeDescription(type),
    }));

    return {
      message: 'Maintenance types retrieved successfully',
      data: { maintenanceTypes: types },
    };
  }

  async getHistoryEvents(
    assetIdParam: string,
    query: {
      status?: string;
      type?: string;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
      sortBy?: 'date' | 'status' | 'type';
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    },
  ) {
    // Resolve asset
    const asset = await this.resolveAssetId(assetIdParam);
    if (!asset) throw new NotFoundException('Asset not found');

    const page = Math.max(query.page || 1, 1);
    const limit = Math.min(query.limit || 20, 100);

    // Base where
    const where: any = { assetId: asset.id, isActive: true };

    // Filters - Don't filter by status at database level since we create events based on status
    // if (query.status) where.status = query.status as any
    if (query.type) where.maintenanceType = query.type as any;

    if (query.search) {
      where.OR = [
        { description: { contains: query.search, mode: 'insensitive' } },
        { completionNotes: { contains: query.search, mode: 'insensitive' } },
        { cancellationNotes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Date range boundaries
    const { from, to } = this.getDateBoundaries(query.dateFrom, query.dateTo);

    // We will fetch and expand to events (SCHEDULED/IN_PROGRESS/COMPLETED/CANCELLED) and then filter/sort/paginate in memory for simplicity
    const schedules = await this.prisma.maintenanceSchedule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { asset: { select: { id: true } } },
    });

    const events = this.buildMaintenanceEvents(schedules);

    // Filtering
    const filtered = this.filterMaintenanceEvents(events, query, from, to);

    // Sorting
    this.sortMaintenanceEvents(
      filtered,
      query.sortBy || 'date',
      (query.sortOrder || 'desc') === 'asc' ? 1 : -1,
    );

    const totalCount = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * limit;
    const pageItems = filtered.slice(start, start + limit).map((e) => ({
      id: e.id,
      description: e.description,
      maintenanceTypeName: e.maintenanceTypeName,
      status: e.status,
      date: e.date.toISOString(),
      scheduledDateOnly: e.scheduledDateOnly,
      estimatedCost: e.estimatedCost,
      actualCost: e.actualCost,
      completionNotes: e.completionNotes,
      cancellationNotes: e.cancellationNotes,
    }));

    return {
      message: 'Maintenance events retrieved successfully',
      data: {
        events: pageItems,
        pagination: {
          totalCount,
          currentPage,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrevious: currentPage > 1,
        },
      },
    };
  }

  private async resolveAssetId(assetIdParam: string) {
    const isNumeric = /^\d+$/.test(assetIdParam);
    if (isNumeric) {
      return this.prisma.asset.findUnique({
        where: { id: Number.parseInt(assetIdParam) },
        select: { id: true },
      });
    }
    return this.prisma.asset.findUnique({
      where: { assetId: assetIdParam },
      select: { id: true },
    });
  }

  private getDateBoundaries(dateFrom?: string, dateTo?: string) {
    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? new Date(dateTo) : undefined;
    return { from, to };
  }

  private buildMaintenanceEvents(schedules: any[]): MaintenanceEventRow[] {
    const events: MaintenanceEventRow[] = [];
    for (const s of schedules) {
      const scheduledOnly = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(s.scheduledDate);
      const base = {
        id: s.id,
        description: s.description,
        maintenanceTypeName: s.maintenanceType,
        actualCost: s.actualCost
          ? Number.parseFloat(s.actualCost.toString())
          : null,
        estimatedCost: s.estimatedCost
          ? Number.parseFloat(s.estimatedCost.toString())
          : null,
        completionNotes: s.completionNotes || null,
        cancellationNotes: s.cancellationNotes || null,
        scheduledDate: s.scheduledDate,
        actualStartDate: s.actualStartDate,
        actualCompletionDate: s.actualCompletionDate,
        cancellationDate: s.cancellationDate,
        scheduledDateOnly: scheduledOnly,
      };
      events.push({ ...base, status: 'SCHEDULED', date: s.createdAt });
      if (s.actualCompletionDate)
        events.push({
          ...base,
          status: 'COMPLETED',
          date: s.actualCompletionDate,
        });
      if (s.cancellationDate)
        events.push({ ...base, status: 'CANCELLED', date: s.cancellationDate });
    }
    return events;
  }

  private filterMaintenanceEvents(
    events: MaintenanceEventRow[],
    query: { status?: string; type?: string; search?: string },
    from?: Date,
    to?: Date,
  ): MaintenanceEventRow[] {
    let filtered = events;
    if (from) filtered = filtered.filter((e) => e.date >= from);
    if (to) {
      const toEnd = new Date(to);
      toEnd.setHours(23, 59, 59, 999);
      filtered = filtered.filter((e) => e.date <= toEnd);
    }
    if (query.status)
      filtered = filtered.filter((e) => e.status === query.status);
    if (query.type)
      filtered = filtered.filter((e) => e.maintenanceTypeName === query.type);
    if (query.search) {
      const q = query.search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          (e.completionNotes || '').toLowerCase().includes(q) ||
          (e.cancellationNotes || '').toLowerCase().includes(q),
      );
    }
    return filtered;
  }

  private sortMaintenanceEvents(
    rows: MaintenanceEventRow[],
    sortBy: 'date' | 'status' | 'type',
    order: 1 | -1,
  ) {
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortBy === 'type')
        cmp = a.maintenanceTypeName.localeCompare(b.maintenanceTypeName);
      else cmp = a.date.getTime() - b.date.getTime();
      return cmp * order;
    });
  }

  private getMaintenanceTypeDescription(type: MaintenanceTypeEnum): string {
    switch (type) {
      case MaintenanceTypeEnum.PREVENTIVE:
        return 'Regular upkeep and preventive care';
      case MaintenanceTypeEnum.CORRECTIVE:
        return 'Fix known issues and problems';
      case MaintenanceTypeEnum.EMERGENCY:
        return 'Urgent repairs and critical fixes';
      case MaintenanceTypeEnum.UPGRADE:
        return 'Hardware/Software updates and improvements';
      default:
        return 'Maintenance work';
    }
  }

  private formatMaintenanceResponse(maintenance: any) {
    const assetName =
      `${maintenance.asset?.brand?.name || ''} ${maintenance.asset?.model?.name || ''} ${maintenance.asset?.assetType?.name || ''}`.trim();

    return {
      id: maintenance.id,
      assetId: maintenance.asset?.assetId || '',
      assetName: assetName || 'Unknown Asset',
      assetType: maintenance.asset?.assetType?.name || '',
      assetBrand: maintenance.asset?.brand?.name || '',
      assetModel: maintenance.asset?.model?.name || '',
      maintenanceTypeId: maintenance.maintenanceType,
      maintenanceTypeName:
        maintenance.maintenanceType.charAt(0) +
        maintenance.maintenanceType.slice(1).toLowerCase().replace('_', ' '),
      scheduledDate: maintenance.scheduledDate.toISOString(),
      frequencyDays: maintenance.frequencyDays,
      description: maintenance.description,
      estimatedCost: maintenance.estimatedCost
        ? Number.parseFloat(maintenance.estimatedCost.toString())
        : null,
      assignedTo: maintenance.assignedTo,
      status: maintenance.status,
      actualStartDate: maintenance.actualStartDate
        ? maintenance.actualStartDate.toISOString()
        : null,
      actualCompletionDate: maintenance.actualCompletionDate
        ? maintenance.actualCompletionDate.toISOString()
        : null,
      actualCost: maintenance.actualCost
        ? Number.parseFloat(maintenance.actualCost.toString())
        : null,
      completionNotes: maintenance.completionNotes,
      cancellationDate: maintenance.cancellationDate
        ? maintenance.cancellationDate.toISOString()
        : null,
      cancellationReason: maintenance.cancellationReason,
      cancellationNotes: maintenance.cancellationNotes,
      createdAt: maintenance.createdAt.toISOString(),
      updatedAt: maintenance.updatedAt.toISOString(),
    };
  }

  /**
   * Format value for comparison (used in filter)
   */
  private formatValueForComparison(value: any): string | null {
    if (value === null || value === undefined) return null;

    // Handle Date objects only (not strings that look like dates)
    if (value instanceof Date) {
      return value.toISOString().split('T')[0]; // yyyy-mm-dd format
    }

    // Handle Prisma Decimal objects
    if (value && typeof value === 'object' && 'toFixed' in value) {
      return Number(value).toString();
    }

    // Return as-is for all other values (strings, numbers, etc.)
    return value.toString();
  }

  /**
   * Format value for display (used in map)
   */
  private formatValueForDisplay(value: any): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const isPrismaDecimal = (v: any): boolean =>
      Boolean(v) && typeof v === 'object' && 'toFixed' in v;
    const isDateObject = (v: any): boolean => v instanceof Date;

    switch (true) {
      case isDateObject(value):
        return (value as Date).toISOString().split('T')[0]; // yyyy-mm-dd
      case isPrismaDecimal(value):
        return Number(value).toString();
      default:
        return String(value);
    }
  }

  // Export maintenance records to Excel
  async exportMaintenanceToExcel(queryDto: MaintenanceExportQueryDto) {
    try {
      const {
        search,
        status,
        assetId,
        maintenanceType,
        scheduledDateFrom,
        scheduledDateTo,
        fromDate,
        toDate,
        sortBy = 'id',
        sortOrder = 'desc',
      } = queryDto;

      // Build where clause
      const where: Prisma.MaintenanceScheduleWhereInput = {
        isActive: true,
      };

      if (search) {
        where.OR = [
          { description: { contains: search, mode: 'insensitive' } },
          { completionNotes: { contains: search, mode: 'insensitive' } },
          { cancellationNotes: { contains: search, mode: 'insensitive' } },
          { asset: { assetId: { contains: search, mode: 'insensitive' } } },
        ];
      }

      if (status) {
        where.status = status;
      }

      if (assetId) {
        where.assetId = assetId;
      }

      if (maintenanceType) {
        where.maintenanceType = maintenanceType;
      }

      const dateFrom = scheduledDateFrom || fromDate;
      const dateTo = scheduledDateTo || toDate;
      if (dateFrom || dateTo) {
        const start = dateFrom ? new Date(dateFrom) : undefined;
        const end = dateTo ? new Date(dateTo) : undefined;
        if (end) end.setHours(23, 59, 59, 999);

        const buildRange = (
          field:
            | 'scheduledDate'
            | 'actualStartDate'
            | 'actualCompletionDate'
            | 'cancellationDate',
        ) => ({
          [field]: {
            ...(start ? { gte: start } : {}),
            ...(end ? { lte: end } : {}),
          },
        });

        // Include records whose scheduled OR lifecycle dates fall in range (covers CANCELLED as well)
        (where as any).AND = [
          {
            OR: [
              buildRange('scheduledDate'),
              buildRange('actualStartDate'),
              buildRange('actualCompletionDate'),
              buildRange('cancellationDate'),
            ],
          },
        ];
      }

      // Build orderBy clause
      const orderBy: any = {};
      switch (sortBy) {
        case 'scheduledDate':
          orderBy.scheduledDate = sortOrder;
          break;
        case 'createdAt':
          orderBy.createdAt = sortOrder;
          break;
        case 'status':
          orderBy.status = sortOrder;
          break;
        case 'maintenanceType':
          orderBy.maintenanceType = sortOrder;
          break;
        case 'estimatedCost':
          orderBy.estimatedCost = sortOrder;
          break;
        case 'id':
          orderBy.id = sortOrder;
          break;
        default:
          orderBy.id = 'desc'; // Default to maintenance ID descending (bigger to smaller)
      }

      // Get all maintenance records with related data
      const maintenanceRecords = await this.prisma.maintenanceSchedule.findMany(
        {
          where,
          include: {
            asset: {
              include: {
                assetType: { select: { name: true } },
                brand: { select: { name: true } },
                model: { select: { name: true } },
              },
            },
            createdByUser: { select: { id: true, username: true } },
            updatedByUser: { select: { id: true, username: true } },
          },
          orderBy,
        },
      );

      // Filter to only include COMPLETED records (has completion date, no cancellation date, and status is COMPLETED)
      const completedRecords = maintenanceRecords.filter((record) => {
        const isCompleted = record.status === 'COMPLETED';
        const hasCompletionDate = !!record.actualCompletionDate;
        const hasNoCancellationDate = !record.cancellationDate;

        return isCompleted && hasCompletionDate && hasNoCancellationDate;
      });

      // Prepare data for Excel export
      const exportData = completedRecords.map((record) => [
        record.id.toString(),
        record.asset.assetId,
        record.asset.assetType.name,
        record.asset.brand.name,
        record.asset.model.name,
        record.asset.serialNumber,
        record.maintenanceType,
        record.description,
        record.scheduledDate.toISOString().replace('T', ' ').split('.')[0],
        record.actualStartDate
          ? record.actualStartDate.toISOString().replace('T', ' ').split('.')[0]
          : '',
        record.actualCompletionDate
          ? record.actualCompletionDate
              .toISOString()
              .replace('T', ' ')
              .split('.')[0]
          : '',
        record.cancellationDate
          ? record.cancellationDate
              .toISOString()
              .replace('T', ' ')
              .split('.')[0]
          : '',
        record.status,
        record.frequencyDays || '',
        record.estimatedCost ? Number(record.estimatedCost).toFixed(2) : '',
        record.actualCost ? Number(record.actualCost).toFixed(2) : '',
        record.completionNotes || '',
        record.cancellationNotes || '',
        record.createdByUser?.username || 'System',
        record.updatedByUser?.username || 'System',
        record.createdAt.toISOString().replace('T', ' ').split('.')[0],
        record.updatedAt.toISOString().replace('T', ' ').split('.')[0],
      ]);

      const headers = [
        'Maintenance ID',
        'Asset ID',
        'Asset Type',
        'Asset Brand',
        'Asset Model',
        'Serial Number',
        'Maintenance Type',
        'Description',
        'Scheduled Date',
        'Actual Start Date',
        'Actual Completion Date',
        'Cancellation Date',
        'Status',
        'Frequency (Days)',
        'Estimated Cost',
        'Actual Cost',
        'Completion Notes',
        'Cancellation Notes',
        'Created By',
        'Updated By',
        'Created At',
        'Updated At',
      ];

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...exportData]);

      // Set column widths
      const columnWidths = [
        { wch: 15 }, // Maintenance ID
        { wch: 12 }, // Asset ID
        { wch: 15 }, // Asset Type
        { wch: 15 }, // Asset Brand
        { wch: 15 }, // Asset Model
        { wch: 20 }, // Serial Number
        { wch: 15 }, // Maintenance Type
        { wch: 40 }, // Description
        { wch: 12 }, // Scheduled Date
        { wch: 12 }, // Actual Start Date
        { wch: 12 }, // Actual Completion Date
        { wch: 12 }, // Cancellation Date
        { wch: 12 }, // Status
        { wch: 12 }, // Frequency
        { wch: 12 }, // Estimated Cost
        { wch: 12 }, // Actual Cost
        { wch: 40 }, // Completion Notes
        { wch: 40 }, // Cancellation Notes
        { wch: 15 }, // Created By
        { wch: 15 }, // Updated By
        { wch: 12 }, // Created At
        { wch: 12 }, // Updated At
      ];
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        'Completed Maintenance Report',
      );

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
      });

      return excelBuffer;
    } catch (error) {
      console.error('Error exporting maintenance to Excel:', error);
      throw new Error('Failed to export maintenance to Excel');
    }
  }

  /**
   * Get maintenance statistics based on latest status per asset
   */
  async getMaintenanceStats() {
    try {
      // Use raw SQL to get the latest maintenance record per asset
      const latestMaintenancePerAsset = await this.prisma.$queryRaw`
        SELECT DISTINCT ON (ms."asset_id") 
          ms."asset_id",
          ms."status",
          ms."scheduled_date",
          ms."created_at"
        FROM "maintenance_schedules" ms
        ORDER BY ms."asset_id", ms."scheduled_date" DESC, ms."created_at" DESC
      `;

      // Initialize counters
      const counts = {
        total: 0,
        underMaintenance: 0,
        scheduled: 0,
        completed: 0,
        cancelled: 0,
      };

      // Count by latest status
      const records = latestMaintenancePerAsset as Array<{
        asset_id: number;
        status: string;
        scheduled_date: Date;
        created_at: Date;
      }>;
      
      for (const record of records) {
        counts.total++;
        if (record.status === MaintenanceStatus.IN_PROGRESS)
          counts.underMaintenance++;
        else if (record.status === MaintenanceStatus.SCHEDULED)
          counts.scheduled++;
        else if (record.status === MaintenanceStatus.COMPLETED)
          counts.completed++;
        else if (record.status === MaintenanceStatus.CANCELLED)
          counts.cancelled++;
      }

      // Calculate percentages
      const total = counts.total || 1;
      const percentages = {
        underMaintenancePercent: Math.round(
          (counts.underMaintenance / total) * 100,
        ),
        scheduledPercent: Math.round((counts.scheduled / total) * 100),
        completedPercent: Math.round((counts.completed / total) * 100),
        cancelledPercent: Math.round((counts.cancelled / total) * 100),
      };

      return {
        counts,
        percentages,
      };
    } catch (error) {
      console.error('Error fetching maintenance stats:', error);
      throw new Error('Failed to fetch maintenance statistics');
    }
  }
}

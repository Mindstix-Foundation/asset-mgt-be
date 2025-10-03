import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { MaintenanceQueryDto } from './dto/maintenance-query.dto';
import { MaintenanceStatus, MaintenanceTypeEnum, Prisma, AssetEventType } from '@prisma/client';

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createMaintenanceDto: CreateMaintenanceDto, userId: number) {


    try {
      const { assetId, scheduledDate, ...rest } = createMaintenanceDto;



      // Check if asset exists
      const asset = await this.prisma.asset.findUnique({
        where: { id: assetId },
      });

      if (!asset) {
        throw new NotFoundException('Asset not found');
      }

      // Check if asset is assigned - only allow maintenance for available assets
      if (asset.status === 'ASSIGNED') {
        throw new BadRequestException('Cannot schedule maintenance for assigned assets. Asset must be available.');
      }

    // Check if asset is available for maintenance on the scheduled date
    const existingMaintenance = await this.prisma.maintenanceSchedule.findFirst({
      where: {
        assetId,
        scheduledDate: new Date(scheduledDate),
        status: {
          in: [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS],
        },
      },
    });


    if (existingMaintenance) {
      throw new ConflictException('Asset is already scheduled for maintenance on this date');
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
          connect: { id: assetId }
        },
        createdByUser: {
          connect: { id: userId }
        },
        updatedByUser: {
          connect: { id: userId }
        },
        scheduledDate: new Date(scheduledDate),
        estimatedCost: createMaintenanceDto.estimatedCost ? new Prisma.Decimal(createMaintenanceDto.estimatedCost) : null,
        status: isToday ? MaintenanceStatus.IN_PROGRESS : MaintenanceStatus.SCHEDULED,
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

        return created;
      });

      // Log maintenance scheduled event
      await this.prisma.assetEvent.create({
        data: {
          assetId: assetId,
          eventType: AssetEventType.MAINTENANCE_SCHEDULED,
          eventDate: new Date(),
          performedBy: userId,
          metadata: {
            maintenanceId: maintenance.id,
            maintenanceType: createMaintenanceDto.maintenanceType,
            scheduledDate: createMaintenanceDto.scheduledDate, // Already in yyyy-mm-dd format from DTO
            estimatedCost: createMaintenanceDto.estimatedCost,
            description: createMaintenanceDto.description,
            frequencyDays: createMaintenanceDto.frequencyDays,
            assetId: maintenance.asset.assetId,
            assetType: maintenance.asset.assetType.name,
            brand: maintenance.asset.brand.name,
            model: maintenance.asset.model.name,
            previousStatus: 'AVAILABLE',
            newStatus: 'IN_MAINTENANCE',
            scheduledVia: 'ScheduleMaintenanceView'
          }
        }
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
        timestamp: new Date().toISOString()
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
      conditions.push(`UPPER(m.maintenance_type::text) = UPPER($${params.length + 1})`);
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

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

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
    const maintenances = (maintenanceResults as any[]).map(row => ({
      id: row.id.toString(),
      assetId: row.asset_asset_id,
      assetName: `${row.asset_type_name} - ${row.brand_name} ${row.model_name}`,
      maintenanceTypeId: row.maintenance_type,
      maintenanceTypeName: row.maintenance_type,
      status: row.status,
      assignedTo: 'Internal Team',
      scheduledDate: row.scheduled_date,
      estimatedCost: row.estimated_cost ? Number(row.estimated_cost) : null,
      actualCost: row.actual_cost ? Number(row.actual_cost) : null,
      description: row.description,
      completionNotes: row.completion_notes,
      cancellationNotes: row.cancellation_notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

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

  async update(id: number, updateMaintenanceDto: UpdateMaintenanceDto, userId: number) {
    const existingMaintenance = await this.prisma.maintenanceSchedule.findUnique({
      where: { id },
    });

    if (!existingMaintenance) {
      throw new NotFoundException('Maintenance not found');
    }

    // If updating asset or scheduled date, check availability
    if (updateMaintenanceDto.assetId || updateMaintenanceDto.scheduledDate) {
      const assetId = updateMaintenanceDto.assetId || existingMaintenance.assetId;
      const scheduledDate = updateMaintenanceDto.scheduledDate || existingMaintenance.scheduledDate.toISOString().split('T')[0];

      const conflictingMaintenance = await this.prisma.maintenanceSchedule.findFirst({
        where: {
          id: { not: id },
          assetId,
          scheduledDate: new Date(scheduledDate),
          status: {
            in: [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS],
          },
        },
      });

      if (conflictingMaintenance) {
        throw new ConflictException('Asset is already scheduled for maintenance on this date');
      }
    }

    const updateData: any = {
      ...updateMaintenanceDto,
      updatedBy: userId,
    };

    // Handle date conversions
    if (updateMaintenanceDto.scheduledDate) {
      updateData.scheduledDate = new Date(updateMaintenanceDto.scheduledDate);
    }
    if (updateMaintenanceDto.actualStartDate) {
      updateData.actualStartDate = new Date(updateMaintenanceDto.actualStartDate);
    }
    if (updateMaintenanceDto.actualCompletionDate) {
      updateData.actualCompletionDate = new Date(updateMaintenanceDto.actualCompletionDate);
    }
    if (updateMaintenanceDto.cancellationDate) {
      updateData.cancellationDate = new Date(updateMaintenanceDto.cancellationDate);
    }

    // Handle decimal conversions
    if (updateMaintenanceDto.estimatedCost !== undefined) {
      updateData.estimatedCost = updateMaintenanceDto.estimatedCost ? new Prisma.Decimal(updateMaintenanceDto.estimatedCost) : null;
    }
    if (updateMaintenanceDto.actualCost !== undefined) {
      updateData.actualCost = updateMaintenanceDto.actualCost ? new Prisma.Decimal(updateMaintenanceDto.actualCost) : null;
    }

    // If the user updates the scheduled date to today, move to IN_PROGRESS on the server side
    let shouldStartToday = false;
    if (updateMaintenanceDto.scheduledDate) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (updateMaintenanceDto.scheduledDate === todayStr) {
        shouldStartToday = true;
        updateData.status = MaintenanceStatus.IN_PROGRESS;
        updateData.actualStartDate = new Date();
      }
    }

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
        await tx.asset.update({ where: { id: updated.assetId }, data: { status: 'IN_MAINTENANCE' } });
      }

      return updated;
    });

    // Log maintenance updated event
    await this.prisma.assetEvent.create({
      data: {
        assetId: maintenance.assetId,
        eventType: AssetEventType.MAINTENANCE_UPDATED,
        eventDate: new Date(),
        performedBy: userId,
          metadata: {
            maintenanceId: maintenance.id,
            maintenanceType: maintenance.maintenanceType,
            scheduledDate: maintenance.scheduledDate.toISOString().split('T')[0], // Format as yyyy-mm-dd
            estimatedCost: maintenance.estimatedCost,
            description: maintenance.description,
            frequencyDays: maintenance.frequencyDays,
            assetId: maintenance.asset.assetId,
            assetType: maintenance.asset.assetType.name,
            brand: maintenance.asset.brand.name,
            model: maintenance.asset.model.name,
            status: maintenance.status,
            changes: Object.keys(updateMaintenanceDto)
              .filter(key => {
                // Only include meaningful fields that can be updated
                const meaningfulFields = [
                  'maintenanceType',
                  'scheduledDate', 
                  'estimatedCost',
                  'description',
                  'frequencyDays'
                ];
                return meaningfulFields.includes(key);
              })
              .filter(key => {
                // Only include fields that actually changed
                let oldValue = this.formatValueForComparison(existingMaintenance[key]);
                let newValue = this.formatValueForComparison(updateMaintenanceDto[key]);
                
                return oldValue !== newValue;
              })
              .map(key => {
                // Format values properly for display
                const oldValue = this.formatValueForDisplay(existingMaintenance[key]);
                const newValue = this.formatValueForDisplay(updateMaintenanceDto[key]);
                
                return {
                  fieldName: key,
                  oldValue: oldValue,
                  newValue: newValue
                };
              })
          }
      }
    });

    return {
      message: 'Maintenance updated successfully',
      data: { maintenance: this.formatMaintenanceResponse(maintenance) },
    };
  }

  async remove(id: number, userId: number) {
    const maintenance = await this.prisma.maintenanceSchedule.findUnique({
      where: { id },
    });

    if (!maintenance) {
      throw new NotFoundException('Maintenance not found');
    }

    // Soft delete by updating status
    await this.prisma.maintenanceSchedule.update({
      where: { id },
      data: {
        status: MaintenanceStatus.CANCELLED,
        cancellationDate: new Date(),
        cancellationReason: 'Deleted by user',
        updatedBy: userId,
      },
    });

    return {
      message: 'Maintenance deleted successfully',
    };
  }

  async completeMaintenance(id: number, actualCost: number, completionNotes?: string, userId?: number) {
    const maintenance = await this.prisma.maintenanceSchedule.findUnique({ where: { id } });

    if (!maintenance) {
      throw new NotFoundException('Maintenance not found');
    }

    if (maintenance.status !== MaintenanceStatus.IN_PROGRESS && maintenance.status !== MaintenanceStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled or in-progress maintenance can be completed');
    }

    const result = await this.prisma.$transaction(async (tx) => {
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
          status: { in: [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS] },
        },
      });

      if (stillActive === 0) {
        await tx.asset.update({ where: { id: updated.assetId }, data: { status: 'AVAILABLE' } });
      }

      return updated;
    });

    // Log maintenance completed event
    await this.prisma.assetEvent.create({
      data: {
        assetId: result.assetId,
        eventType: AssetEventType.MAINTENANCE_COMPLETED,
        eventDate: new Date(),
        performedBy: userId || maintenance.updatedBy,
          metadata: {
            maintenanceId: result.id,
            maintenanceType: result.maintenanceType,
            scheduledDate: result.scheduledDate.toISOString().split('T')[0], // Format as yyyy-mm-dd
            actualCompletionDate: result.actualCompletionDate?.toISOString().split('T')[0] || null, // Format as yyyy-mm-dd
            estimatedCost: result.estimatedCost,
            actualCost: result.actualCost,
            description: result.description,
            completionNotes: result.completionNotes,
            assetId: result.asset.assetId,
            assetType: result.asset.assetType.name,
            brand: result.asset.brand.name,
            model: result.asset.model.name,
            previousStatus: 'IN_MAINTENANCE',
            newStatus: 'AVAILABLE'
          }
      }
    });

    return {
      message: 'Maintenance completed successfully',
      data: { maintenance: this.formatMaintenanceResponse(result) },
    };
  }

  async cancelMaintenance(id: number, _cancelDate: string | undefined, cancelNotes: string, userId?: number) {
    const maintenance = await this.prisma.maintenanceSchedule.findUnique({ where: { id } });

    if (!maintenance) {
      throw new NotFoundException('Maintenance not found');
    }

    if (maintenance.status === MaintenanceStatus.COMPLETED || maintenance.status === MaintenanceStatus.CANCELLED) {
      throw new BadRequestException('Cannot cancel completed or already cancelled maintenance');
    }

    const result = await this.prisma.$transaction(async (tx) => {
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
          status: { in: [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS] },
        },
      });

      if (stillActive === 0) {
        await tx.asset.update({ where: { id: updated.assetId }, data: { status: 'AVAILABLE' } });
      }

      return updated;
    });

    // Log maintenance cancelled event
    await this.prisma.assetEvent.create({
      data: {
        assetId: result.assetId,
        eventType: AssetEventType.MAINTENANCE_CANCELLED,
        eventDate: new Date(),
        performedBy: userId || maintenance.updatedBy,
          metadata: {
            maintenanceId: result.id,
            maintenanceType: result.maintenanceType,
            scheduledDate: result.scheduledDate.toISOString().split('T')[0], // Format as yyyy-mm-dd
            cancellationDate: result.cancellationDate?.toISOString().split('T')[0] || null, // Format as yyyy-mm-dd
            estimatedCost: result.estimatedCost,
            description: result.description,
            cancellationNotes: result.cancellationNotes,
            assetId: result.asset.assetId,
            assetType: result.asset.assetType.name,
            brand: result.asset.brand.name,
            model: result.asset.model.name,
            previousStatus: 'IN_MAINTENANCE',
            newStatus: 'AVAILABLE'
          }
      }
    });

    return {
      message: 'Maintenance cancelled successfully',
      data: { maintenance: this.formatMaintenanceResponse(result) },
    };
  }

  async checkAssetAvailability(assetId: number, scheduledDate: string, excludeMaintenanceId?: number) {
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

    const existingMaintenance = await this.prisma.maintenanceSchedule.findFirst({
      where,
    });

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
          where: { id: parseInt(assetId) },
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
      const maintenanceHistory = await this.prisma.maintenanceSchedule.findMany({
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
      });

      return {
        message: 'Maintenance history retrieved successfully',
        data: {
          asset: {
            id: asset.id,
            assetId: asset.assetId,
            name: `${asset.assetType?.name} - ${asset.brand?.name} ${asset.model?.name}`,
          },
          maintenanceHistory: maintenanceHistory.map(this.formatMaintenanceResponse),
          totalRecords: maintenanceHistory.length,
        },
      };
    } catch (error) {
      console.error('❌ Error in MaintenanceService.getMaintenanceHistory:', {
        error: error.message,
        assetId,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async getMaintenanceTypes() {
    const types = Object.values(MaintenanceTypeEnum).map(type => ({
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
    query: { status?: string; type?: string; search?: string; dateFrom?: string; dateTo?: string; sortBy?: 'date' | 'status' | 'type'; sortOrder?: 'asc' | 'desc'; page?: number; limit?: number }
  ) {
    // Resolve asset
    let asset: any
    const isNumeric = /^\d+$/.test(assetIdParam)
    if (isNumeric) {
      asset = await this.prisma.asset.findUnique({ where: { id: parseInt(assetIdParam) }, select: { id: true } })
    } else {
      asset = await this.prisma.asset.findUnique({ where: { assetId: assetIdParam }, select: { id: true } })
    }
    if (!asset) throw new NotFoundException('Asset not found')

    const page = Math.max(query.page || 1, 1)
    const limit = Math.min(query.limit || 20, 100)

    // Base where
    const where: any = { assetId: asset.id, isActive: true }

    // Filters - Don't filter by status at database level since we create events based on status
    // if (query.status) where.status = query.status as any
    if (query.type) where.maintenanceType = query.type as any

    if (query.search) {
      where.OR = [
        { description: { contains: query.search, mode: 'insensitive' } },
        { completionNotes: { contains: query.search, mode: 'insensitive' } },
        { cancellationNotes: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    // Date range applies to timeline date (actualStart when IN_PROGRESS, scheduled otherwise; completion/cancellation when set)
    const from = query.dateFrom ? new Date(query.dateFrom) : undefined
    const to = query.dateTo ? new Date(query.dateTo) : undefined

    // We will fetch and expand to events (SCHEDULED/IN_PROGRESS/COMPLETED/CANCELLED) and then filter/sort/paginate in memory for simplicity
    const schedules = await this.prisma.maintenanceSchedule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { asset: { select: { id: true } } },
    })


    type EventRow = { id: number; description: string; maintenanceTypeName: string; status: string; date: Date; scheduledDateOnly: string; actualCost?: number | null; estimatedCost?: number | null; completionNotes?: string | null; cancellationNotes?: string | null; scheduledDate?: Date | null; actualStartDate?: Date | null; actualCompletionDate?: Date | null; cancellationDate?: Date | null }
    const events: EventRow[] = []

    for (const s of schedules) {
      const scheduledOnly = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(s.scheduledDate)
      const base = {
        id: s.id,
        description: s.description,
        maintenanceTypeName: s.maintenanceType,
        actualCost: s.actualCost ? parseFloat(s.actualCost.toString()) : null,
        estimatedCost: s.estimatedCost ? parseFloat(s.estimatedCost.toString()) : null,
        completionNotes: s.completionNotes || null,
        cancellationNotes: s.cancellationNotes || null,
        scheduledDate: s.scheduledDate,
        actualStartDate: s.actualStartDate,
        actualCompletionDate: s.actualCompletionDate,
        cancellationDate: s.cancellationDate,
        scheduledDateOnly: scheduledOnly,
      }

      // Scheduled event
      // date (top-right) = createdAt (scheduled at time), scheduledDateOnly = scheduled date
      events.push({ ...base, status: 'SCHEDULED', date: s.createdAt })
      // Do not include IN_PROGRESS in the event stream per UX requirements
      // Completed event
      if (s.actualCompletionDate) events.push({ ...base, status: 'COMPLETED', date: s.actualCompletionDate })
      // Cancelled event
      if (s.cancellationDate) events.push({ ...base, status: 'CANCELLED', date: s.cancellationDate })
    }

    // Date filtering
    let filtered = events
    if (from) filtered = filtered.filter(e => e.date >= from)
    if (to) {
      const toEnd = new Date(to); toEnd.setHours(23,59,59,999)
      filtered = filtered.filter(e => e.date <= toEnd)
    }
    if (query.status) filtered = filtered.filter(e => e.status === query.status)
    if (query.type) filtered = filtered.filter(e => e.maintenanceTypeName === query.type)
    if (query.search) {
      const q = query.search.toLowerCase()
      filtered = filtered.filter(e => e.description.toLowerCase().includes(q) || (e.completionNotes||'').toLowerCase().includes(q) || (e.cancellationNotes||'').toLowerCase().includes(q))
    }

    const sortBy = query.sortBy || 'date'
    const order = (query.sortOrder || 'desc') === 'asc' ? 1 : -1
    filtered.sort((a,b) => {
      let cmp = 0
      if (sortBy === 'status') cmp = a.status.localeCompare(b.status)
      else if (sortBy === 'type') cmp = a.maintenanceTypeName.localeCompare(b.maintenanceTypeName)
      else cmp = a.date.getTime() - b.date.getTime()
      return cmp * order
    })

    const totalCount = filtered.length
    const totalPages = Math.max(1, Math.ceil(totalCount / limit))
    const currentPage = Math.min(page, totalPages)
    const start = (currentPage - 1) * limit
    const pageItems = filtered.slice(start, start + limit).map(e => ({
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
    }))

    return {
      message: 'Maintenance events retrieved successfully',
      data: {
        events: pageItems,
        pagination: { totalCount, currentPage, totalPages, hasNext: currentPage < totalPages, hasPrevious: currentPage > 1 }
      }
    }
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
    const assetName = `${maintenance.asset?.brand?.name || ''} ${maintenance.asset?.model?.name || ''} ${maintenance.asset?.assetType?.name || ''}`.trim();
    
    return {
      id: maintenance.id,
      assetId: maintenance.asset?.assetId || '',
      assetName: assetName || 'Unknown Asset',
      assetType: maintenance.asset?.assetType?.name || '',
      assetBrand: maintenance.asset?.brand?.name || '',
      assetModel: maintenance.asset?.model?.name || '',
      maintenanceTypeId: maintenance.maintenanceType,
      maintenanceTypeName: maintenance.maintenanceType.charAt(0) + maintenance.maintenanceType.slice(1).toLowerCase().replace('_', ' '),
      scheduledDate: maintenance.scheduledDate.toISOString(),
      frequencyDays: maintenance.frequencyDays,
      description: maintenance.description,
      estimatedCost: maintenance.estimatedCost ? parseFloat(maintenance.estimatedCost.toString()) : null,
      assignedTo: maintenance.assignedTo,
      status: maintenance.status,
      actualStartDate: maintenance.actualStartDate ? maintenance.actualStartDate.toISOString() : null,
      actualCompletionDate: maintenance.actualCompletionDate ? maintenance.actualCompletionDate.toISOString() : null,
      actualCost: maintenance.actualCost ? parseFloat(maintenance.actualCost.toString()) : null,
      completionNotes: maintenance.completionNotes,
      cancellationDate: maintenance.cancellationDate ? maintenance.cancellationDate.toISOString() : null,
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
    
    // Return as-is for all other values (strings, numbers, etc.)
    return value.toString();
  }

  /**
   * Format value for display (used in map)
   */
  private formatValueForDisplay(value: any): string | null {
    if (value === null || value === undefined) return null;
    
    // Handle Date objects only (not strings that look like dates)
    if (value instanceof Date) {
      return value.toISOString().split('T')[0]; // yyyy-mm-dd format
    }
    
    // Return as-is for all other values (strings, numbers, etc.)
    return value.toString();
  }
} 
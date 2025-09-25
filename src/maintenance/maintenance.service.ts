import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { MaintenanceQueryDto } from './dto/maintenance-query.dto';
import { MaintenanceStatus, MaintenanceTypeEnum, Prisma } from '@prisma/client';

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

      // If vendor is specified, check if it exists
      if (createMaintenanceDto.vendorId) {
        const vendor = await this.prisma.vendor.findUnique({
          where: { id: createMaintenanceDto.vendorId },
        });


        if (!vendor) {
          throw new NotFoundException('Vendor not found');
        }
      }

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
      };

      // Handle vendor connection if provided
      if (createMaintenanceDto.vendorId) {
        maintenanceData.vendor = {
          connect: { id: createMaintenanceDto.vendorId }
        };
      }
      

      const maintenance = await this.prisma.maintenanceSchedule.create({
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
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
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
      vendorId,
      vendorName,
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
        estimated_cost, vendor_id, status, actual_start_date, actual_completion_date,
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
      conditions.push(`m.status = $${params.length + 1}`);
      params.push(status);
    }

    if (assetId) {
      conditions.push(`m.asset_id = $${params.length + 1}`);
      params.push(assetId);
    }

    if (maintenanceType) {
      conditions.push(`m.maintenance_type = $${params.length + 1}`);
      params.push(maintenanceType);
    }

    if (vendorId) {
      conditions.push(`m.vendor_id = $${params.length + 1}`);
      params.push(vendorId);
    }

    if (vendorName) {
      conditions.push(`v.name ILIKE $${params.length + 1}`);
      params.push(`%${vendorName}%`);
    }

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
      case 'vendorName':
        orderByClause = `ORDER BY v.name ${sortOrder.toUpperCase()}`;
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
        mo.name as model_name,
        v.id as vendor_id,
        v.name as vendor_name,
        v.email as vendor_email,
        v.phone as vendor_phone
      FROM latest_maintenance m
      LEFT JOIN assets a ON m.asset_id = a.id
      LEFT JOIN asset_types at ON a.asset_type_id = at.id
      LEFT JOIN brands b ON a.brand_id = b.id
      LEFT JOIN models mo ON a.model_id = mo.id
      LEFT JOIN vendors v ON m.vendor_id = v.id
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
      LEFT JOIN vendors v ON m.vendor_id = v.id
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
      vendorName: row.vendor_name,
      assignedTo: row.vendor_name || 'Internal Team',
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
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
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

    const maintenance = await this.prisma.maintenanceSchedule.update({
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
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
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
    const maintenance = await this.prisma.maintenanceSchedule.findUnique({
      where: { id },
    });

    if (!maintenance) {
      throw new NotFoundException('Maintenance not found');
    }

    if (maintenance.status !== MaintenanceStatus.IN_PROGRESS && maintenance.status !== MaintenanceStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled or in-progress maintenance can be completed');
    }

    const updatedMaintenance = await this.prisma.maintenanceSchedule.update({
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
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return {
      message: 'Maintenance completed successfully',
      data: { maintenance: this.formatMaintenanceResponse(updatedMaintenance) },
    };
  }

  async cancelMaintenance(id: number, cancelDate: string, cancelNotes: string, userId?: number) {
    const maintenance = await this.prisma.maintenanceSchedule.findUnique({
      where: { id },
    });

    if (!maintenance) {
      throw new NotFoundException('Maintenance not found');
    }

    if (maintenance.status === MaintenanceStatus.COMPLETED || maintenance.status === MaintenanceStatus.CANCELLED) {
      throw new BadRequestException('Cannot cancel completed or already cancelled maintenance');
    }

    const updatedMaintenance = await this.prisma.maintenanceSchedule.update({
      where: { id },
      data: {
        status: MaintenanceStatus.CANCELLED,
        cancellationDate: new Date(cancelDate),
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
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return {
      message: 'Maintenance cancelled successfully',
      data: { maintenance: this.formatMaintenanceResponse(updatedMaintenance) },
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
          vendor: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
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
      scheduledDate: maintenance.scheduledDate.toISOString().split('T')[0],
      frequencyDays: maintenance.frequencyDays,
      description: maintenance.description,
      estimatedCost: maintenance.estimatedCost ? parseFloat(maintenance.estimatedCost.toString()) : null,
      vendorId: maintenance.vendorId,
      vendorName: maintenance.vendor?.name || null,
      assignedTo: maintenance.assignedTo,
      status: maintenance.status,
      actualStartDate: maintenance.actualStartDate ? maintenance.actualStartDate.toISOString().split('T')[0] : null,
      actualCompletionDate: maintenance.actualCompletionDate ? maintenance.actualCompletionDate.toISOString().split('T')[0] : null,
      actualCost: maintenance.actualCost ? parseFloat(maintenance.actualCost.toString()) : null,
      completionNotes: maintenance.completionNotes,
      cancellationDate: maintenance.cancellationDate ? maintenance.cancellationDate.toISOString().split('T')[0] : null,
      cancellationReason: maintenance.cancellationReason,
      cancellationNotes: maintenance.cancellationNotes,
      createdAt: maintenance.createdAt.toISOString(),
      updatedAt: maintenance.updatedAt.toISOString(),
    };
  }
} 
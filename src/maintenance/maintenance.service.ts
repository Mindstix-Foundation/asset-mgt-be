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
    const where: Prisma.MaintenanceScheduleWhereInput = {};

    // Apply filters
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { asset: { assetId: { contains: search, mode: 'insensitive' } } },
        { completionNotes: { contains: search, mode: 'insensitive' } },
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

    if (vendorId) {
      where.vendorId = vendorId;
    }

    if (vendorName) {
      where.vendor = {
        name: { contains: vendorName, mode: 'insensitive' }
      };
    }

    if (scheduledDateFrom || scheduledDateTo) {
      where.scheduledDate = {};
      if (scheduledDateFrom) {
        where.scheduledDate.gte = new Date(scheduledDateFrom);
      }
      if (scheduledDateTo) {
        where.scheduledDate.lte = new Date(scheduledDateTo);
      }
    }

    // Build orderBy
    const orderBy: Prisma.MaintenanceScheduleOrderByWithRelationInput = {};
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
      case 'vendorName':
        orderBy.vendor = {
          name: sortOrder
        };
        break;
      default:
        orderBy.scheduledDate = sortOrder;
    }

    const [maintenances, total] = await Promise.all([
      this.prisma.maintenanceSchedule.findMany({
        where,
        skip,
        take: limit,
        orderBy,
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
      }),
      this.prisma.maintenanceSchedule.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      message: 'Maintenances retrieved successfully',
      data: {
        maintenances: maintenances.map(this.formatMaintenanceResponse),
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
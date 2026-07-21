import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateModelDto, ModelQueryDto } from './dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class ModelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(createModelDto: CreateModelDto, userId: number, tenantId: number) {
    try {
      // Verify brand and asset type exist within the same tenant
      const [brand, assetType] = await Promise.all([
        this.prisma.brand.findFirst({ where: { id: createModelDto.brandId, tenantId } }),
        this.prisma.assetType.findFirst({
          where: { id: createModelDto.assetTypeId, tenantId },
        }),
      ]);

      if (!brand) {
        throw new BadRequestException('Brand not found');
      }
      if (!assetType) {
        throw new BadRequestException('Asset type not found');
      }

      const model = await this.prisma.model.create({
        data: {
          ...createModelDto,
          tenantId,
          createdBy: userId,
          updatedBy: userId,
        },
        include: {
          brand: {
            select: { id: true, name: true },
          },
          assetType: {
            select: {
              id: true,
              name: true,
              category: { select: { id: true, name: true } },
            },
          },
          createdByUser: {
            select: { id: true, username: true },
          },
          _count: {
            select: { assets: true },
          },
        },
      });

      await this.auditService.log({
        tableName: 'models',
        recordId: model.id,
        action: AuditAction.INSERT,
        userId,
        tenantId,
        entityLabel: model.name,
        summary: `Created model ${model.name}`,
        after: { name: model.name, brandId: model.brandId, assetTypeId: model.assetTypeId },
      });

      return {
        message: 'Model created successfully',
        data: { model },
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Model name already exists for this brand and asset type',
        );
      }
      throw error;
    }
  }

  async findAll(queryDto: ModelQueryDto, tenantId: number) {
    const {
      page = 1,
      limit = 10,
      search,
      brandId,
      assetTypeId,
      sortBy = 'name',
      sortOrder = 'asc',
    } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' as const };
    }

    if (brandId) {
      where.brandId = brandId;
    }

    if (assetTypeId) {
      where.assetTypeId = assetTypeId;
    }

    const orderBy = { [sortBy]: sortOrder } as any;

    const [models, totalCount] = await Promise.all([
      this.prisma.model.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          brand: {
            select: { id: true, name: true },
          },
          assetType: {
            select: {
              id: true,
              name: true,
              category: { select: { id: true, name: true } },
            },
          },
          createdByUser: {
            select: { id: true, username: true },
          },
          _count: {
            select: { assets: true },
          },
        },
      }),
      this.prisma.model.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      message: 'Models retrieved successfully',
      data: {
        models,
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

  async findByBrandAndAssetType(brandId: number, assetTypeId: number, tenantId: number) {
    // First verify both brand and asset type exist within the tenant
    const [brand, assetType] = await Promise.all([
      this.prisma.brand.findFirst({ where: { id: brandId, tenantId } }),
      this.prisma.assetType.findFirst({ where: { id: assetTypeId, tenantId } }),
    ]);

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    if (!assetType) {
      throw new NotFoundException('Asset type not found');
    }

    const models = await this.prisma.model.findMany({
      where: {
        tenantId,
        brandId: brandId,
        assetTypeId: assetTypeId,
      },
      include: {
        brand: {
          select: { id: true, name: true },
        },
        assetType: {
          select: {
            id: true,
            name: true,
            category: { select: { id: true, name: true } },
          },
        },
        createdByUser: {
          select: { id: true, username: true },
        },
        _count: {
          select: { assets: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      message: 'Models retrieved successfully',
      data: { models },
    };
  }

  async findOne(id: number, tenantId: number) {
    const model = await this.prisma.model.findFirst({
      where: { id, tenantId },
      include: {
        brand: {
          select: { id: true, name: true, description: true },
        },
        assetType: {
          select: {
            id: true,
            name: true,
            description: true,
            category: { select: { id: true, name: true, description: true } },
          },
        },
        createdByUser: {
          select: { id: true, username: true },
        },
        updatedByUser: {
          select: { id: true, username: true },
        },
        assets: {
          select: {
            id: true,
            assetId: true,
            status: true,
            condition: true,
            purchaseDate: true,
            purchaseCost: true,
          },
          take: 10, // Limit to first 10 assets
        },
        _count: {
          select: { assets: true },
        },
      },
    });

    if (!model) {
      throw new NotFoundException('Model not found');
    }

    return {
      message: 'Model retrieved successfully',
      data: { model },
    };
  }

  async remove(id: number, userId: number, tenantId: number) {
    try {
      // Check if model has associated assets
      const modelWithAssets = await this.prisma.model.findFirst({
        where: { id, tenantId },
        include: {
          _count: {
            select: { assets: true },
          },
        },
      });

      if (!modelWithAssets) {
        throw new NotFoundException('Model not found');
      }

      if (modelWithAssets._count.assets > 0) {
        throw new BadRequestException(
          'Cannot delete model with associated assets',
        );
      }

      await this.prisma.model.delete({
        where: { id },
      });

      await this.auditService.log({
        tableName: 'models',
        recordId: id,
        action: AuditAction.DELETE,
        userId,
        tenantId,
        entityLabel: modelWithAssets.name,
        summary: `Deleted model ${modelWithAssets.name}`,
        before: { name: modelWithAssets.name },
      });

      return {
        message: 'Model deleted successfully',
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Model not found');
      }
      throw error;
    }
  }
}

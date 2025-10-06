import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateModelDto, ModelQueryDto } from './dto';

@Injectable()
export class ModelsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createModelDto: CreateModelDto, userId: number) {
    try {
      // Verify brand and asset type exist
      const [brand, assetType] = await Promise.all([
        this.prisma.brand.findUnique({ where: { id: createModelDto.brandId } }),
        this.prisma.assetType.findUnique({
          where: { id: createModelDto.assetTypeId },
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

  async findAll(queryDto: ModelQueryDto) {
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

    const where: any = {};

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

  async findByBrandAndAssetType(brandId: number, assetTypeId: number) {
    // First verify both brand and asset type exist
    const [brand, assetType] = await Promise.all([
      this.prisma.brand.findUnique({ where: { id: brandId } }),
      this.prisma.assetType.findUnique({ where: { id: assetTypeId } }),
    ]);

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    if (!assetType) {
      throw new NotFoundException('Asset type not found');
    }

    const models = await this.prisma.model.findMany({
      where: {
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

  async findOne(id: number) {
    const model = await this.prisma.model.findUnique({
      where: { id },
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

  async remove(id: number) {
    try {
      // Check if model has associated assets
      const modelWithAssets = await this.prisma.model.findUnique({
        where: { id },
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

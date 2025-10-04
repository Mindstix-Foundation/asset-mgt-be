import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssetTypeDto, AssetTypeQueryDto } from './dto';

@Injectable()
export class AssetTypesService {
  constructor(private prisma: PrismaService) {}

  async create(createAssetTypeDto: CreateAssetTypeDto, userId: number) {
    try {
      // Verify category exists
      const category = await this.prisma.assetCategory.findUnique({
        where: { id: createAssetTypeDto.categoryId }
      });

      if (!category) {
        throw new BadRequestException('Asset category not found');
      }

      const assetType = await this.prisma.assetType.create({
        data: {
          ...createAssetTypeDto,
          createdBy: userId,
          updatedBy: userId,
        },
        include: {
          category: {
            select: { id: true, name: true }
          },
          createdByUser: {
            select: { id: true, username: true }
          },
          _count: {
            select: { assets: true, models: true }
          }
        },
      });

      return {
        message: 'Asset type created successfully',
        data: { assetType },
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Asset type name already exists in this category');
      }
      throw error;
    }
  }

  async findAll(queryDto: AssetTypeQueryDto) {
    const { page = 1, limit = 10, search, categoryId, isActive, sortBy = 'name', sortOrder = 'asc' } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const orderBy = { [sortBy]: sortOrder } as any;

    const [assetTypes, totalCount] = await Promise.all([
      this.prisma.assetType.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: {
            select: { id: true, name: true }
          },
          createdByUser: {
            select: { id: true, username: true }
          },
          _count: {
            select: { assets: true, models: true }
          }
        },
      }),
      this.prisma.assetType.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      message: 'Asset types retrieved successfully',
      data: {
        assetTypes,
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

  async findByCategory(categoryId: number) {
    // First verify the category exists
    const category = await this.prisma.assetCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      throw new NotFoundException('Asset category not found');
    }

    const assetTypes = await this.prisma.assetType.findMany({
      where: { 
        categoryId: categoryId,
        isActive: true 
      },
      include: {
        category: {
          select: { id: true, name: true }
        },
        createdByUser: {
          select: { id: true, username: true }
        },
        _count: {
          select: { assets: true, models: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return {
      message: 'Asset types retrieved successfully',
      data: { assetTypes },
    };
  }

  async findOne(id: number) {
    const assetType = await this.prisma.assetType.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, description: true }
        },
        createdByUser: {
          select: { id: true, username: true }
        },
        updatedByUser: {
          select: { id: true, username: true }
        },
        models: {
          select: {
            id: true,
            name: true,
            brand: {
              select: { id: true, name: true }
            },
            _count: {
              select: { assets: true }
            }
          }
        },
        assets: {
          select: {
            id: true,
            assetId: true,
            status: true,
            condition: true,
            brand: {
              select: { id: true, name: true }
            }
          },
          take: 10 // Limit to first 10 assets
        },
        _count: {
          select: { assets: true, models: true }
        }
      },
    });

    if (!assetType) {
      throw new NotFoundException('Asset type not found');
    }

    return {
      message: 'Asset type retrieved successfully',
      data: { assetType },
    };
  }


  async remove(id: number) {
    try {
      // Check if asset type has associated models or assets
      const assetTypeWithRelations = await this.prisma.assetType.findUnique({
        where: { id },
        include: {
          _count: {
            select: { models: true, assets: true }
          }
        }
      });

      if (!assetTypeWithRelations) {
        throw new NotFoundException('Asset type not found');
      }

      if (assetTypeWithRelations._count.models > 0 || assetTypeWithRelations._count.assets > 0) {
        throw new BadRequestException(
          'Cannot delete asset type with associated models or assets'
        );
      }

      await this.prisma.assetType.delete({
        where: { id },
      });

      return {
        message: 'Asset type deleted successfully',
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Asset type not found');
      }
      throw error;
    }
  }


  // Helper method for creating default user


} 
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssetCategoryDto, UpdateAssetCategoryDto, AssetCategoryQueryDto } from './dto';

@Injectable()
export class AssetCategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createAssetCategoryDto: CreateAssetCategoryDto, userId: number) {
    try {
      const assetCategory = await this.prisma.assetCategory.create({
        data: {
          ...createAssetCategoryDto,
          createdBy: userId,
          updatedBy: userId,
        },
        include: {
          createdByUser: {
            select: { id: true, username: true }
          },
          _count: {
            select: { assetTypes: true }
          }
        },
      });

      return {
        message: 'Asset category created successfully',
        data: { assetCategory },
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Asset category name already exists');
      }
      throw error;
    }
  }

  async findAll(queryDto: AssetCategoryQueryDto) {
    const { page = 1, limit = 10, search, sortBy = 'name', sortOrder = 'asc' } = queryDto;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const orderBy = { [sortBy]: sortOrder } as any;

    const [assetCategories, totalCount] = await Promise.all([
      this.prisma.assetCategory.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          createdByUser: {
            select: { id: true, username: true }
          },
          _count: {
            select: { assetTypes: true }
          }
        },
      }),
      this.prisma.assetCategory.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      message: 'Asset categories retrieved successfully',
      data: {
        assetCategories,
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
    const assetCategory = await this.prisma.assetCategory.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: { id: true, username: true }
        },
        updatedByUser: {
          select: { id: true, username: true }
        },
        assetTypes: {
          select: {
            id: true,
            name: true,
            isActive: true,
            _count: {
              select: { assets: true }
            }
          }
        },
        _count: {
          select: { assetTypes: true }
        }
      },
    });

    if (!assetCategory) {
      throw new NotFoundException('Asset category not found');
    }

    return {
      message: 'Asset category retrieved successfully',
      data: { assetCategory },
    };
  }

  async update(id: number, updateAssetCategoryDto: UpdateAssetCategoryDto, userId: number) {
    try {
      const assetCategory = await this.prisma.assetCategory.update({
        where: { id },
        data: {
          ...updateAssetCategoryDto,
          updatedBy: userId,
        },
        include: {
          createdByUser: {
            select: { id: true, username: true }
          },
          updatedByUser: {
            select: { id: true, username: true }
          },
          _count: {
            select: { assetTypes: true }
          }
        },
      });

      return {
        message: 'Asset category updated successfully',
        data: { assetCategory },
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Asset category name already exists');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Asset category not found');
      }
      throw error;
    }
  }

  async remove(id: number) {
    try {
      // Check if category has associated asset types
      const categoryWithTypes = await this.prisma.assetCategory.findUnique({
        where: { id },
        include: {
          _count: {
            select: { assetTypes: true }
          }
        }
      });

      if (!categoryWithTypes) {
        throw new NotFoundException('Asset category not found');
      }

      if (categoryWithTypes._count.assetTypes > 0) {
        throw new BadRequestException(
          'Cannot delete asset category with associated asset types'
        );
      }

      await this.prisma.assetCategory.delete({
        where: { id },
      });

      return {
        message: 'Asset category deleted successfully',
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Asset category not found');
      }
      throw error;
    }
  }

  async mergeCategories(sourceId: number, targetId: number, userId: number) {
    if (sourceId === targetId) {
      throw new BadRequestException('Cannot merge category with itself');
    }

    try {
      // Start a transaction to ensure atomicity
      const result = await this.prisma.$transaction(async (prisma) => {
        // Verify both categories exist
        const [sourceCategory, targetCategory] = await Promise.all([
          prisma.assetCategory.findUnique({
            where: { id: sourceId },
            include: {
              assetTypes: {
                include: {
                  assets: true
                }
              },
              _count: {
                select: { assetTypes: true }
              }
            }
          }),
          prisma.assetCategory.findUnique({
            where: { id: targetId },
            include: {
              _count: {
                select: { assetTypes: true }
              }
            }
          })
        ]);

        if (!sourceCategory) {
          throw new NotFoundException(`Source category with ID ${sourceId} not found`);
        }
        if (!targetCategory) {
          throw new NotFoundException(`Target category with ID ${targetId} not found`);
        }

        // Count what will be transferred
        let transferredAssets = 0;
        sourceCategory.assetTypes.forEach(assetType => {
          transferredAssets += assetType.assets.length;
        });

        // Transfer all asset types from source to target category
        await prisma.assetType.updateMany({
          where: { categoryId: sourceId },
          data: { 
            categoryId: targetId,
            updatedBy: userId
          }
        });

        // Delete the source category
        await prisma.assetCategory.delete({
          where: { id: sourceId }
        });

        // Update the target category's updatedAt timestamp
        await prisma.assetCategory.update({
          where: { id: targetId },
          data: { updatedBy: userId }
        });

        return {
          sourceCategory: sourceCategory.name,
          targetCategory: targetCategory.name,
          transferredAssetTypes: sourceCategory._count.assetTypes,
          transferredAssets
        };
      });

      return {
        message: 'Categories merged successfully',
        data: { mergeOperation: result }
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Source or target category not found');
      }
      throw error;
    }
  }
} 
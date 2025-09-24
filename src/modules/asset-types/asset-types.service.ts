import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssetTypeDto, UpdateAssetTypeDto, AssetTypeQueryDto } from './dto';

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

  async update(id: number, updateAssetTypeDto: UpdateAssetTypeDto, userId: number) {
    try {
      // If categoryId is being updated, verify it exists
      if (updateAssetTypeDto.categoryId) {
        const category = await this.prisma.assetCategory.findUnique({
          where: { id: updateAssetTypeDto.categoryId }
        });

        if (!category) {
          throw new BadRequestException('Asset category not found');
        }
      }

      const assetType = await this.prisma.assetType.update({
        where: { id },
        data: {
          ...updateAssetTypeDto,
          updatedBy: userId,
        },
        include: {
          category: {
            select: { id: true, name: true }
          },
          createdByUser: {
            select: { id: true, username: true }
          },
          updatedByUser: {
            select: { id: true, username: true }
          },
          _count: {
            select: { assets: true, models: true }
          }
        },
      });

      return {
        message: 'Asset type updated successfully',
        data: { assetType },
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Asset type name already exists in this category');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Asset type not found');
      }
      throw error;
    }
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

  async findByCategory(categoryId: number) {
    const assetTypes = await this.prisma.assetType.findMany({
      where: { 
        categoryId,
        isActive: true 
      },
      orderBy: { name: 'asc' },
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
      }
    });

    return {
      message: 'Asset types retrieved successfully',
      data: { assetTypes },
    };
  }

  // Helper method for creating default user
  async getOrCreateDefaultUser(): Promise<number> {
    let defaultUser = await this.prisma.user.findFirst({
      where: { username: 'system' },
    });

    if (!defaultUser) {
      // Create default employee first
      const defaultEmployee = await this.prisma.employee.create({
        data: {
          employeeId: 'SYS001',
          firstName: 'System',
          lastName: 'User',
          email: 'system@company.com',
          createdBy: 1, // Bootstrap
          updatedBy: 1,
        },
      });

      defaultUser = await this.prisma.user.create({
        data: {
          employeeId: defaultEmployee.id,
          username: 'system',
          passwordHash: 'system',
          createdBy: 1, // Bootstrap
          updatedBy: 1,
        },
      });
    }

    return defaultUser.id;
  }

  async mergeAssetTypes(sourceId: number, targetId: number, userId: number) {
    if (sourceId === targetId) {
      throw new BadRequestException('Cannot merge asset type with itself');
    }

    try {
      // Start a transaction to ensure atomicity
      const result = await this.prisma.$transaction(async (prisma) => {
        // Verify both asset types exist and are in the same category
        const [sourceAssetType, targetAssetType] = await Promise.all([
          prisma.assetType.findUnique({
            where: { id: sourceId },
            include: {
              category: true,
              models: {
                include: {
                  assets: true
                }
              },
              assets: true,
              _count: {
                select: { models: true, assets: true }
              }
            }
          }),
          prisma.assetType.findUnique({
            where: { id: targetId },
            include: {
              category: true,
              _count: {
                select: { models: true, assets: true }
              }
            }
          })
        ]);

        if (!sourceAssetType) {
          throw new NotFoundException(`Source asset type with ID ${sourceId} not found`);
        }
        if (!targetAssetType) {
          throw new NotFoundException(`Target asset type with ID ${targetId} not found`);
        }

        // Ensure both asset types are in the same category
        if (sourceAssetType.categoryId !== targetAssetType.categoryId) {
          throw new BadRequestException('Cannot merge asset types from different categories');
        }

        // Count what will be transferred
        let transferredAssets = sourceAssetType._count.assets;
        sourceAssetType.models.forEach(model => {
          transferredAssets += model.assets.length;
        });

        // Transfer all models from source to target asset type
        await prisma.model.updateMany({
          where: { assetTypeId: sourceId },
          data: { 
            assetTypeId: targetId,
            updatedBy: userId
          }
        });

        // Transfer all assets from source to target asset type
        await prisma.asset.updateMany({
          where: { assetTypeId: sourceId },
          data: { 
            assetTypeId: targetId,
            updatedBy: userId
          }
        });

        // Delete the source asset type
        await prisma.assetType.delete({
          where: { id: sourceId }
        });

        // Update the target asset type's updatedAt timestamp
        await prisma.assetType.update({
          where: { id: targetId },
          data: { updatedBy: userId }
        });

        return {
          sourceAssetType: sourceAssetType.name,
          targetAssetType: targetAssetType.name,
          transferredModels: sourceAssetType._count.models,
          transferredAssets
        };
      });

      return {
        message: 'Asset types merged successfully',
        data: { mergeOperation: result }
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Source or target asset type not found');
      }
      throw error;
    }
  }
} 
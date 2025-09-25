import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateModelDto, UpdateModelDto, ModelQueryDto } from './dto';

@Injectable()
export class ModelsService {
  constructor(private prisma: PrismaService) {}

  async create(createModelDto: CreateModelDto, userId: number) {
    try {
      // Verify brand and asset type exist
      const [brand, assetType] = await Promise.all([
        this.prisma.brand.findUnique({ where: { id: createModelDto.brandId } }),
        this.prisma.assetType.findUnique({ where: { id: createModelDto.assetTypeId } }),
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
            select: { id: true, name: true }
          },
          assetType: {
            select: { id: true, name: true, category: { select: { id: true, name: true } } }
          },
          createdByUser: {
            select: { id: true, username: true }
          },
          _count: {
            select: { assets: true }
          }
        },
      });

      return {
        message: 'Model created successfully',
        data: { model },
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Model name already exists for this brand and asset type');
      }
      throw error;
    }
  }

  async findAll(queryDto: ModelQueryDto) {
    const { page = 1, limit = 10, search, brandId, assetTypeId, sortBy = 'name', sortOrder = 'asc' } = queryDto;
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
            select: { id: true, name: true }
          },
          assetType: {
            select: { id: true, name: true, category: { select: { id: true, name: true } } }
          },
          createdByUser: {
            select: { id: true, username: true }
          },
          _count: {
            select: { assets: true }
          }
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

  async findOne(id: number) {
    const model = await this.prisma.model.findUnique({
      where: { id },
      include: {
        brand: {
          select: { id: true, name: true, description: true }
        },
        assetType: {
          select: { 
            id: true, 
            name: true, 
            description: true,
            category: { select: { id: true, name: true, description: true } }
          }
        },
        createdByUser: {
          select: { id: true, username: true }
        },
        updatedByUser: {
          select: { id: true, username: true }
        },
        assets: {
          select: {
            id: true,
            assetId: true,
            status: true,
            condition: true,
            purchaseDate: true,
            purchaseCost: true
          },
          take: 10 // Limit to first 10 assets
        },
        _count: {
          select: { assets: true }
        }
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

  async update(id: number, updateModelDto: UpdateModelDto, userId: number) {
    try {
      // If brandId or assetTypeId are being updated, verify they exist
      if (updateModelDto.brandId || updateModelDto.assetTypeId) {
        const checks: Promise<any>[] = [];
        if (updateModelDto.brandId) {
          checks.push(this.prisma.brand.findUnique({ where: { id: updateModelDto.brandId } }));
        }
        if (updateModelDto.assetTypeId) {
          checks.push(this.prisma.assetType.findUnique({ where: { id: updateModelDto.assetTypeId } }));
        }

        const results = await Promise.all(checks);
        let index = 0;
        if (updateModelDto.brandId && !results[index++]) {
          throw new BadRequestException('Brand not found');
        }
        if (updateModelDto.assetTypeId && !results[index++]) {
          throw new BadRequestException('Asset type not found');
        }
      }

      const model = await this.prisma.model.update({
        where: { id },
        data: {
          ...updateModelDto,
          updatedBy: userId,
        },
        include: {
          brand: {
            select: { id: true, name: true }
          },
          assetType: {
            select: { id: true, name: true, category: { select: { id: true, name: true } } }
          },
          createdByUser: {
            select: { id: true, username: true }
          },
          updatedByUser: {
            select: { id: true, username: true }
          },
          _count: {
            select: { assets: true }
          }
        },
      });

      return {
        message: 'Model updated successfully',
        data: { model },
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Model name already exists for this brand and asset type');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Model not found');
      }
      throw error;
    }
  }

  async remove(id: number) {
    try {
      // Check if model has associated assets
      const modelWithAssets = await this.prisma.model.findUnique({
        where: { id },
        include: {
          _count: {
            select: { assets: true }
          }
        }
      });

      if (!modelWithAssets) {
        throw new NotFoundException('Model not found');
      }

      if (modelWithAssets._count.assets > 0) {
        throw new BadRequestException(
          'Cannot delete model with associated assets'
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



  async findByBrand(brandId: number) {
    const models = await this.prisma.model.findMany({
      where: { 
        brandId
      },
      orderBy: { name: 'asc' },
      include: {
        assetType: {
          select: { 
            id: true, 
            name: true,
            category: {
              select: { id: true, name: true }
            }
          }
        },
        _count: {
          select: { assets: true }
        }
      }
    });

    return {
      message: 'Models retrieved successfully',
      data: { models },
    };
  }

  async findByBrandAndAssetType(brandId: number, assetTypeId: number) {
    const models = await this.prisma.model.findMany({
      where: { 
        brandId,
        assetTypeId
      },
      orderBy: { name: 'asc' },
      include: {
        brand: {
          select: { id: true, name: true }
        },
        assetType: {
          select: { id: true, name: true }
        },
        _count: {
          select: { assets: true }
        }
      }
    });

    return {
      message: 'Models retrieved successfully',
      data: { models },
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

  async mergeModels(sourceId: number, targetId: number, userId: number) {
    if (sourceId === targetId) {
      throw new BadRequestException('Cannot merge model with itself');
    }

    try {
      // Start a transaction to ensure atomicity
      const result = await this.prisma.$transaction(async (prisma) => {
        // Verify both models exist and are compatible
        const [sourceModel, targetModel] = await Promise.all([
          prisma.model.findUnique({
            where: { id: sourceId },
            include: {
              brand: true,
              assetType: true,
              assets: true,
              _count: {
                select: { assets: true }
              }
            }
          }),
          prisma.model.findUnique({
            where: { id: targetId },
            include: {
              brand: true,
              assetType: true,
              _count: {
                select: { assets: true }
              }
            }
          })
        ]);

        if (!sourceModel) {
          throw new NotFoundException(`Source model with ID ${sourceId} not found`);
        }
        if (!targetModel) {
          throw new NotFoundException(`Target model with ID ${targetId} not found`);
        }

        // Ensure both models have the same brand and asset type
        if (sourceModel.brandId !== targetModel.brandId) {
          throw new BadRequestException('Cannot merge models from different brands');
        }
        if (sourceModel.assetTypeId !== targetModel.assetTypeId) {
          throw new BadRequestException('Cannot merge models from different asset types');
        }

        // Transfer all assets from source to target model
        await prisma.asset.updateMany({
          where: { modelId: sourceId },
          data: { 
            modelId: targetId,
            updatedBy: userId
          }
        });

        // Delete the source model
        await prisma.model.delete({
          where: { id: sourceId }
        });

        // Update the target model's updatedAt timestamp
        await prisma.model.update({
          where: { id: targetId },
          data: { updatedBy: userId }
        });

        return {
          sourceModel: sourceModel.name,
          targetModel: targetModel.name,
          transferredAssets: sourceModel._count.assets
        };
      });

      return {
        message: 'Models merged successfully',
        data: { mergeOperation: result }
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Source or target model not found');
      }
      throw error;
    }
  }
} 
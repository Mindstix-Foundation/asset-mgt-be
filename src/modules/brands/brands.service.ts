import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBrandDto, UpdateBrandDto, BrandQueryDto } from './dto';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async create(createBrandDto: CreateBrandDto, userId: number) {
    try {
      // Check for case-insensitive duplicate
      const existingBrand = await this.prisma.brand.findFirst({
        where: {
          name: {
            equals: createBrandDto.name,
            mode: 'insensitive'
          }
        }
      });

      if (existingBrand) {
        throw new ConflictException('Brand name already exists');
      }

      // Auto-capitalize first letter
      const capitalizedName = createBrandDto.name.charAt(0).toUpperCase() + createBrandDto.name.slice(1).toLowerCase();

      const brand = await this.prisma.brand.create({
        data: {
          ...createBrandDto,
          name: capitalizedName,
          createdBy: userId,
          updatedBy: userId,
        },
        include: {
          createdByUser: {
            select: { id: true, username: true }
          },
          _count: {
            select: { models: true, assets: true }
          }
        },
      });

      return {
        message: 'Brand created successfully',
        data: { brand },
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      if (error.code === 'P2002') {
        throw new ConflictException('Brand name already exists');
      }
      throw error;
    }
  }

  async findAll(queryDto: BrandQueryDto) {
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

    const [brands, totalCount] = await Promise.all([
      this.prisma.brand.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          createdByUser: {
            select: { id: true, username: true }
          },
          _count: {
            select: { models: true, assets: true }
          }
        },
      }),
      this.prisma.brand.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      message: 'Brands retrieved successfully',
      data: {
        brands,
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
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
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
            assetType: {
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
            condition: true
          },
          take: 10 // Limit to first 10 assets
        },
        _count: {
          select: { models: true, assets: true }
        }
      },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    return {
      message: 'Brand retrieved successfully',
      data: { brand },
    };
  }

  async update(id: number, updateBrandDto: UpdateBrandDto, userId: number) {
    try {
      // Check for case-insensitive duplicate if name is being updated
      if (updateBrandDto.name) {
        const existingBrand = await this.prisma.brand.findFirst({
          where: {
            name: {
              equals: updateBrandDto.name,
              mode: 'insensitive'
            },
            id: {
              not: id // Exclude current brand from check
            }
          }
        });

        if (existingBrand) {
          throw new ConflictException('Brand name already exists');
        }
      }

      // Auto-capitalize first letter if name is being updated
      const updateData = { ...updateBrandDto };
      if (updateData.name) {
        updateData.name = updateData.name.charAt(0).toUpperCase() + updateData.name.slice(1).toLowerCase();
      }

      const brand = await this.prisma.brand.update({
        where: { id },
        data: {
          ...updateData,
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
            select: { models: true, assets: true }
          }
        },
      });

      return {
        message: 'Brand updated successfully',
        data: { brand },
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      if (error.code === 'P2002') {
        throw new ConflictException('Brand name already exists');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Brand not found');
      }
      throw error;
    }
  }

  async remove(id: number) {
      // Check if brand has associated models or assets
      const brandWithRelations = await this.prisma.brand.findUnique({
        where: { id },
        include: {
          _count: {
            select: { models: true, assets: true }
          }
        }
      });

      if (!brandWithRelations) {
        throw new NotFoundException('Brand not found');
      }

      if (brandWithRelations._count.models > 0 || brandWithRelations._count.assets > 0) {
      throw new BadRequestException('Cannot delete brand with associated models or assets');
      }

    await this.prisma.brand.delete({ where: { id } });

      return {
        message: 'Brand deleted successfully',
    };
  }

  // Helper method for creating default user
  async getOrCreateDefaultUser(): Promise<number> {
    let defaultUser = await this.prisma.user.findFirst({
      where: { username: 'system' },
    });

    if (!defaultUser) {
      // Create default user if not exists
      const defaultEmployee = await this.prisma.employee.findFirst({
        where: { employeeId: 'SYSTEM001' },
      });

      if (!defaultEmployee) {
        const newEmployee = await this.prisma.employee.create({
        data: {
            employeeId: 'SYSTEM001',
          firstName: 'System',
          lastName: 'User',
          email: 'system@company.com',
            createdBy: 1,
          updatedBy: 1,
        },
      });

        defaultUser = await this.prisma.user.create({
          data: {
            employeeId: newEmployee.id,
            username: 'system',
            passwordHash: 'system',
            createdBy: 1,
            updatedBy: 1,
          },
        });
      } else {
      defaultUser = await this.prisma.user.create({
        data: {
          employeeId: defaultEmployee.id,
          username: 'system',
          passwordHash: 'system',
            createdBy: 1,
          updatedBy: 1,
        },
      });
      }
    }

    return defaultUser.id;
  }

  async mergeBrands(sourceId: number, targetId: number, userId: number) {
    if (sourceId === targetId) {
      throw new BadRequestException('Cannot merge brand with itself');
    }

    try {
      // Start a transaction to ensure atomicity
      const result = await this.prisma.$transaction(async (prisma) => {
        // Verify both brands exist
        const [sourceBrand, targetBrand] = await Promise.all([
          prisma.brand.findUnique({
            where: { id: sourceId },
            include: {
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
          prisma.brand.findUnique({
            where: { id: targetId },
            include: {
              _count: {
                select: { models: true, assets: true }
              }
            }
          })
        ]);

        if (!sourceBrand) {
          throw new NotFoundException(`Source brand with ID ${sourceId} not found`);
        }
        if (!targetBrand) {
          throw new NotFoundException(`Target brand with ID ${targetId} not found`);
        }

        // Count what will be transferred
        let transferredAssets = sourceBrand._count.assets;
        sourceBrand.models.forEach(model => {
          transferredAssets += model.assets.length;
        });

        // Transfer all models from source to target brand
        await prisma.model.updateMany({
          where: { brandId: sourceId },
          data: { 
            brandId: targetId,
            updatedBy: userId
          }
        });

        // Transfer all assets from source to target brand
        await prisma.asset.updateMany({
          where: { brandId: sourceId },
          data: { 
            brandId: targetId,
            updatedBy: userId
          }
        });

        // Delete the source brand
        await prisma.brand.delete({
          where: { id: sourceId }
        });

        // Update the target brand's updatedAt timestamp
        await prisma.brand.update({
          where: { id: targetId },
          data: { updatedBy: userId }
        });

        return {
          sourceBrand: sourceBrand.name,
          targetBrand: targetBrand.name,
          transferredModels: sourceBrand._count.models,
          transferredAssets
        };
      });

      return {
        message: 'Brands merged successfully',
        data: { mergeOperation: result }
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Source or target brand not found');
      }
      throw error;
    }
  }
} 
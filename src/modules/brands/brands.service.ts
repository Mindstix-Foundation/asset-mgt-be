import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBrandDto, UpdateBrandDto, BrandQueryDto } from './dto';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async create(createBrandDto: CreateBrandDto, userId: number) {
    try {
      const brand = await this.prisma.brand.create({
        data: {
          ...createBrandDto,
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
      const brand = await this.prisma.brand.update({
        where: { id },
        data: {
          ...updateBrandDto,
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
    try {
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
        throw new BadRequestException(
          'Cannot delete brand with associated models or assets'
        );
      }

      await this.prisma.brand.delete({
        where: { id },
      });

      return {
        message: 'Brand deleted successfully',
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Brand not found');
      }
      throw error;
    }
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
} 
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateBrandDto, BrandQueryDto } from './dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class BrandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(createBrandDto: CreateBrandDto, userId: number, tenantId: number) {
    try {
      // Check for case-insensitive duplicate within tenant
      const existingBrand = await this.prisma.brand.findFirst({
        where: {
          tenantId,
          name: {
            equals: createBrandDto.name,
            mode: 'insensitive',
          },
        },
      });

      if (existingBrand) {
        throw new ConflictException('Brand name already exists');
      }

      // Auto-capitalize first letter
      const capitalizedName =
        createBrandDto.name.charAt(0).toUpperCase() +
        createBrandDto.name.slice(1).toLowerCase();

      const brand = await this.prisma.brand.create({
        data: {
          ...createBrandDto,
          tenantId,
          name: capitalizedName,
          createdBy: userId,
          updatedBy: userId,
        },
        include: {
          createdByUser: {
            select: { id: true, username: true },
          },
          _count: {
            select: { models: true, assets: true },
          },
        },
      });

      await this.auditService.log({
        tableName: 'brands',
        recordId: brand.id,
        action: AuditAction.INSERT,
        userId,
        tenantId,
        entityLabel: brand.name,
        summary: `Created brand ${brand.name}`,
        after: { name: brand.name, description: brand.description },
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

  async findAll(queryDto: BrandQueryDto, tenantId: number) {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'name',
      sortOrder = 'asc',
    } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const orderBy = { [sortBy]: sortOrder } as any;

    const [brands, totalCount] = await Promise.all([
      this.prisma.brand.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          createdByUser: {
            select: { id: true, username: true },
          },
          _count: {
            select: { models: true, assets: true },
          },
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

  async findOne(id: number, tenantId: number) {
    const brand = await this.prisma.brand.findFirst({
      where: { id, tenantId },
      include: {
        createdByUser: {
          select: { id: true, username: true },
        },
        updatedByUser: {
          select: { id: true, username: true },
        },
        models: {
          select: {
            id: true,
            name: true,
            assetType: {
              select: { id: true, name: true },
            },
            _count: {
              select: { assets: true },
            },
          },
        },
        assets: {
          select: {
            id: true,
            assetId: true,
            status: true,
            condition: true,
          },
          take: 10, // Limit to first 10 assets
        },
        _count: {
          select: { models: true, assets: true },
        },
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

  async remove(id: number, userId: number, tenantId: number) {
    // Check if brand has associated models or assets
    const brandWithRelations = await this.prisma.brand.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: { models: true, assets: true },
        },
      },
    });

    if (!brandWithRelations) {
      throw new NotFoundException('Brand not found');
    }

    if (
      brandWithRelations._count.models > 0 ||
      brandWithRelations._count.assets > 0
    ) {
      throw new BadRequestException(
        'Cannot delete brand with associated models or assets',
      );
    }

    await this.prisma.brand.delete({ where: { id } });

    await this.auditService.log({
      tableName: 'brands',
      recordId: id,
      action: AuditAction.DELETE,
      userId,
      tenantId,
      entityLabel: brandWithRelations.name,
      summary: `Deleted brand ${brandWithRelations.name}`,
      before: { name: brandWithRelations.name },
    });

    return {
      message: 'Brand deleted successfully',
    };
  }
}

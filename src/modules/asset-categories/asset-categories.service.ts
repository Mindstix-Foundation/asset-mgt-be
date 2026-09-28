import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateAssetCategoryDto, AssetCategoryQueryDto } from './dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';
import {
  toUserRef,
  userDisplaySelect,
} from '../../shared/utils/user-display.util';

@Injectable()
export class AssetCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

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
            select: userDisplaySelect,
          },
          _count: {
            select: { assetTypes: true },
          },
        },
      });

      await this.auditService.log({
        tableName: 'asset_categories',
        recordId: assetCategory.id,
        action: AuditAction.INSERT,
        userId,
        entityLabel: assetCategory.name,
        summary: `Created asset category ${assetCategory.name}`,
        after: { name: assetCategory.name, description: assetCategory.description },
      });

      return {
        message: 'Asset category created successfully',
        data: {
          assetCategory: {
            ...assetCategory,
            createdByUser: toUserRef(assetCategory.createdByUser),
          },
        },
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Asset category name already exists');
      }
      throw error;
    }
  }

  async findAll(queryDto: AssetCategoryQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'name',
      sortOrder = 'asc',
    } = queryDto;
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
            select: userDisplaySelect,
          },
          _count: {
            select: { assetTypes: true },
          },
        },
      }),
      this.prisma.assetCategory.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      message: 'Asset categories retrieved successfully',
      data: {
        assetCategories: assetCategories.map((assetCategory) => ({
          ...assetCategory,
          createdByUser: toUserRef(assetCategory.createdByUser),
        })),
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
          select: userDisplaySelect,
        },
        updatedByUser: {
          select: userDisplaySelect,
        },
        assetTypes: {
          select: {
            id: true,
            name: true,
            isActive: true,
            _count: {
              select: { assets: true },
            },
          },
        },
        _count: {
          select: { assetTypes: true },
        },
      },
    });

    if (!assetCategory) {
      throw new NotFoundException('Asset category not found');
    }

    return {
      message: 'Asset category retrieved successfully',
      data: {
        assetCategory: {
          ...assetCategory,
          createdByUser: toUserRef(assetCategory.createdByUser),
          updatedByUser: toUserRef(assetCategory.updatedByUser),
        },
      },
    };
  }

  async remove(id: number, userId: number) {
    try {
      // Check if category has associated asset types
      const categoryWithTypes = await this.prisma.assetCategory.findUnique({
        where: { id },
        include: {
          _count: {
            select: { assetTypes: true },
          },
        },
      });

      if (!categoryWithTypes) {
        throw new NotFoundException('Asset category not found');
      }

      if (categoryWithTypes._count.assetTypes > 0) {
        throw new BadRequestException(
          'Cannot delete asset category with associated asset types',
        );
      }

      await this.prisma.assetCategory.delete({
        where: { id },
      });

      await this.auditService.log({
        tableName: 'asset_categories',
        recordId: id,
        action: AuditAction.DELETE,
        userId,
        entityLabel: categoryWithTypes.name,
        summary: `Deleted asset category ${categoryWithTypes.name}`,
        before: { name: categoryWithTypes.name },
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
}

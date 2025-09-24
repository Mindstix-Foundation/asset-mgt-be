import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const assets = await this.prisma.asset.findMany({
      where: {
        status: {
          not: 'RETIRED',
        },
      },
      select: {
        id: true,
        assetId: true,
        assetType: {
          select: {
            name: true,
          },
        },
        brand: {
          select: {
            name: true,
          },
        },
        model: {
          select: {
            name: true,
          },
        },
        status: true,
      },
      orderBy: {
        assetId: 'asc',
      },
    });

    return {
      message: 'Assets retrieved successfully',
      data: {
        assets: assets.map(asset => ({
          id: asset.id.toString(),
          assetId: asset.assetId,
          assetName: `${asset.brand?.name || ''} ${asset.model?.name || ''} ${asset.assetType?.name || ''}`.trim(),
          assetType: asset.assetType?.name || '',
          brand: asset.brand?.name || '',
          model: asset.model?.name || '',
          status: asset.status,
        })),
      },
    };
  }
} 
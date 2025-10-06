import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getDashboardStats() {
    try {
      // Get total assets count (exclude RETIRED and LOST)
      const totalAssets = await this.prisma.asset.count({
        where: {
          status: {
            notIn: ['RETIRED', 'LOST'],
          },
        },
      });

      // Get assets by status (exclude RETIRED and LOST)
      const assetsByStatus = await this.prisma.asset.groupBy({
        by: ['status'],
        _count: {
          id: true,
        },
        where: {
          status: {
            notIn: ['RETIRED', 'LOST'],
          },
        },
      });

      // Count only assets with active maintenance schedules (SCHEDULED or IN_PROGRESS)
      // This represents assets that are currently being maintained or scheduled for maintenance
      const assetsWithActiveMaintenance = await this.prisma.asset.count({
        where: {
          status: {
            notIn: ['RETIRED', 'LOST'],
          },
          maintenanceSchedules: {
            some: {
              status: {
                in: ['SCHEDULED', 'IN_PROGRESS'],
              },
              isActive: true,
            },
          },
        },
      });

      // Initialize counters
      let assigned = 0;
      let available = 0;
      let maintenanceByStatus = 0;

      // Count assets by status using exact Prisma enum values
      for (const group of assetsByStatus) {
        switch (group.status) {
          case 'ASSIGNED':
            assigned += group._count.id;
            break;
          case 'AVAILABLE':
            available += group._count.id;
            break;
          case 'IN_MAINTENANCE':
            maintenanceByStatus += group._count.id;
            break;
          default:
            // Log unknown status for debugging
            console.warn(`Unknown asset status: ${group.status}`);
            break;
        }
      }

      // Calculate available assets: Total - Maintenance - Assigned
      // This ensures the numbers always add up correctly
      const availableAssets =
        totalAssets - assetsWithActiveMaintenance - assigned;

      const result = {
        totalAssets,
        available: availableAssets,
        assigned,
        maintenance: assetsWithActiveMaintenance,
      };

      return result;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Return fallback data on error
      return {
        totalAssets: 0,
        available: 0,
        assigned: 0,
        maintenance: 0,
      };
    }
  }
}

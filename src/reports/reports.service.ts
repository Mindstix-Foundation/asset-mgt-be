import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import type { Response } from 'express';

export interface ReportFilters {
  reportType?: 'assets' | 'employees' | 'maintenance' | 'audit';
  assetType?: string;
  dateRange?: string;
  fromDate?: string;
  toDate?: string;
}

export interface AssetDistributionData {
  type: string;
  count: number;
  percentage: number;
  value: number;
}

export interface StatusOverviewData {
  status: string;
  count: number;
  percentage: number;
}

export interface RecentActivityData {
  id: string;
  type: 'asset_added' | 'asset_edited' | 'asset_issued' | 'asset_collected' | 'employee_added' | 'employee_edited' | 'maintenance_added' | 'maintenance_edited' | 'maintenance_completed' | 'maintenance_cancelled' | 'vendor_added' | 'vendor_edited';
  description: string;
  timestamp: Date;
  timeAgo: string;
  needsRealTimeUpdate: boolean; // Flag for frontend to handle real-time updates
  assetId?: string;
  employeeId?: string;
  maintenanceId?: string;
  vendorId?: string;
}

export interface AnalyticsData {
  assetDistribution: AssetDistributionData[];
  statusOverview: StatusOverviewData[];
  totalValue: number;
  recentActivity: RecentActivityData[];
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private formatTimeAgo(date: Date): { timeAgo: string; needsRealTimeUpdate: boolean } {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return { timeAgo: 'Just now', needsRealTimeUpdate: true };
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return {
        timeAgo: diffInMinutes === 1 ? '1 minute ago' : `${diffInMinutes} minutes ago`,
        needsRealTimeUpdate: true // All activities less than 1 hour need real-time updates
      };
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return {
        timeAgo: diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`,
        needsRealTimeUpdate: false // Activities 1 hour or older don't need real-time updates
      };
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return {
        timeAgo: diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`,
        needsRealTimeUpdate: false
      };
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return {
        timeAgo: diffInWeeks === 1 ? '1 week ago' : `${diffInWeeks} weeks ago`,
        needsRealTimeUpdate: false
      };
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return {
        timeAgo: diffInMonths === 1 ? '1 month ago' : `${diffInMonths} months ago`,
        needsRealTimeUpdate: false
      };
    }

    const diffInYears = Math.floor(diffInDays / 365);
    return {
      timeAgo: diffInYears === 1 ? '1 year ago' : `${diffInYears} years ago`,
      needsRealTimeUpdate: false
    };
  }

  async getAnalyticsData(): Promise<AnalyticsData> {
    // Get asset distribution by type (exclude RETIRED and LOST)
    const assetsByType = await this.prisma.asset.groupBy({
      by: ['assetTypeId'],
      _count: {
        id: true,
      },
      _sum: {
        purchaseCost: true,
      },
      where: {
        status: {
          notIn: ['RETIRED', 'LOST'],
        },
      },
    });

    // Get asset type names
    const assetTypes = await this.prisma.assetType.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    const assetTypeMap = new Map(assetTypes.map(type => [type.id, type.name]));

    // Count only active assets (exclude RETIRED and LOST)
    const totalAssets = await this.prisma.asset.count({
      where: {
        status: {
          notIn: ['RETIRED', 'LOST'],
        },
      },
    });
    const totalValue = assetsByType.reduce((sum, item) => sum + Number(item._sum.purchaseCost || 0), 0);

    const assetDistribution: AssetDistributionData[] = assetsByType.map(item => ({
      type: assetTypeMap.get(item.assetTypeId) || 'Unknown',
      count: item._count.id,
      percentage: Math.round((item._count.id / totalAssets) * 100),
      value: Number(item._sum.purchaseCost || 0),
    }));

    // Get status overview (exclude RETIRED and LOST)
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

    const statusOverview: StatusOverviewData[] = assetsByStatus.map(item => ({
      status: item.status,
      count: item._count.id,
      percentage: Math.round((item._count.id / totalAssets) * 100),
    }));

    // Get comprehensive recent activities from last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentActivity = await this.getRecentActivities(twentyFourHoursAgo);

    return {
      assetDistribution,
      statusOverview,
      totalValue,
      recentActivity,
    };
  }

  private async getRecentActivities(since: Date): Promise<RecentActivityData[]> {
    const activities: RecentActivityData[] = [];

    // Get recent asset activities (added and edited)
    const recentAssets = await this.prisma.asset.findMany({
      where: {
        OR: [
          { createdAt: { gte: since } },
          { updatedAt: { gte: since } }
        ]
      },
      include: {
        assetType: true,
        brand: true,
        model: true,
        createdByUser: {
          include: {
            employee: true
          }
        },
        updatedByUser: {
          include: {
            employee: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    for (const asset of recentAssets) {
      // Asset added
      if (asset.createdAt >= since) {
        const timeInfo = this.formatTimeAgo(asset.createdAt);
        activities.push({
          id: `asset_added_${asset.id}`,
          type: 'asset_added',
          description: `${asset.brand.name} ${asset.model.name} (${asset.assetId}) added`,
          timestamp: asset.createdAt,
          timeAgo: timeInfo.timeAgo,
          needsRealTimeUpdate: timeInfo.needsRealTimeUpdate,
          assetId: asset.assetId
        });
      }
      
      // Asset edited (only if updated after creation)
      if (asset.updatedAt > asset.createdAt && asset.updatedAt >= since) {
        const timeInfo = this.formatTimeAgo(asset.updatedAt);
        activities.push({
          id: `asset_edited_${asset.id}`,
          type: 'asset_edited',
          description: `${asset.brand.name} ${asset.model.name} (${asset.assetId}) updated`,
          timestamp: asset.updatedAt,
          timeAgo: timeInfo.timeAgo,
          needsRealTimeUpdate: timeInfo.needsRealTimeUpdate,
          assetId: asset.assetId
        });
      }
    }

    // Get recent asset issues (issued and collected)
    const recentAssetIssues = await this.prisma.assetIssue.findMany({
      where: {
        OR: [
          { createdAt: { gte: since } },
          { updatedAt: { gte: since } }
        ]
      },
      include: {
        asset: {
          include: {
            assetType: true,
            brand: true,
            model: true,
          },
        },
        employee: true,
        issuedByUser: {
          include: {
            employee: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    for (const issue of recentAssetIssues) {
      // Asset issued
      if (issue.createdAt >= since) {
        const timeInfo = this.formatTimeAgo(issue.createdAt);
        activities.push({
          id: `asset_issued_${issue.id}`,
          type: 'asset_issued',
          description: `${issue.asset.brand.name} ${issue.asset.model.name} (${issue.asset.assetId}) issued to ${issue.employee.firstName} ${issue.employee.lastName}`,
          timestamp: issue.createdAt,
          timeAgo: timeInfo.timeAgo,
          needsRealTimeUpdate: timeInfo.needsRealTimeUpdate,
          assetId: issue.asset.assetId,
          employeeId: issue.employee.employeeId
        });
      }
      
      // Asset collected (if return date was set recently)
      if (issue.returnDate && issue.updatedAt >= since && issue.updatedAt > issue.createdAt) {
        const timeInfo = this.formatTimeAgo(issue.updatedAt);
        activities.push({
          id: `asset_collected_${issue.id}`,
          type: 'asset_collected',
          description: `${issue.asset.brand.name} ${issue.asset.model.name} (${issue.asset.assetId}) collected from ${issue.employee.firstName} ${issue.employee.lastName}`,
          timestamp: issue.updatedAt,
          timeAgo: timeInfo.timeAgo,
          needsRealTimeUpdate: timeInfo.needsRealTimeUpdate,
          assetId: issue.asset.assetId,
          employeeId: issue.employee.employeeId
        });
      }
    }

    // Get recent employee activities (added and edited)
    const recentEmployees = await this.prisma.employee.findMany({
      where: {
        OR: [
          { createdAt: { gte: since } },
          { updatedAt: { gte: since } }
        ]
      },
      include: {
        createdByUser: {
          include: {
            employee: true
          }
        },
        updatedByUser: {
          include: {
            employee: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    for (const employee of recentEmployees) {
      // Employee added
      if (employee.createdAt >= since) {
        const timeInfo = this.formatTimeAgo(employee.createdAt);
        activities.push({
          id: `employee_added_${employee.id}`,
          type: 'employee_added',
          description: `Employee ${employee.firstName} ${employee.lastName} (${employee.employeeId}) added`,
          timestamp: employee.createdAt,
          timeAgo: timeInfo.timeAgo,
          needsRealTimeUpdate: timeInfo.needsRealTimeUpdate,
          employeeId: employee.employeeId
        });
      }
      
      // Employee edited
      if (employee.updatedAt > employee.createdAt && employee.updatedAt >= since) {
        const timeInfo = this.formatTimeAgo(employee.updatedAt);
        activities.push({
          id: `employee_edited_${employee.id}`,
          type: 'employee_edited',
          description: `Employee ${employee.firstName} ${employee.lastName} (${employee.employeeId}) updated`,
          timestamp: employee.updatedAt,
          timeAgo: timeInfo.timeAgo,
          needsRealTimeUpdate: timeInfo.needsRealTimeUpdate,
          employeeId: employee.employeeId
        });
      }
    }

    // Get recent maintenance activities
    const recentMaintenance = await this.prisma.maintenanceSchedule.findMany({
      where: {
        OR: [
          { createdAt: { gte: since } },
          { updatedAt: { gte: since } },
          { actualCompletionDate: { gte: since } },
          { cancellationDate: { gte: since } }
        ]
      },
      include: {
        asset: {
          include: {
            assetType: true,
            brand: true,
            model: true,
          },
        },
        createdByUser: {
          include: {
            employee: true
          }
        },
        updatedByUser: {
          include: {
            employee: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    for (const maintenance of recentMaintenance) {
      // Maintenance added
      if (maintenance.createdAt >= since) {
        const timeInfo = this.formatTimeAgo(maintenance.createdAt);
        activities.push({
          id: `maintenance_added_${maintenance.id}`,
          type: 'maintenance_added',
          description: `Maintenance scheduled for ${maintenance.asset.brand.name} ${maintenance.asset.model.name} (${maintenance.asset.assetId})`,
          timestamp: maintenance.createdAt,
          timeAgo: timeInfo.timeAgo,
          needsRealTimeUpdate: timeInfo.needsRealTimeUpdate,
          assetId: maintenance.asset.assetId,
          maintenanceId: maintenance.id.toString()
        });
      }
      
      // Maintenance edited
      if (maintenance.updatedAt > maintenance.createdAt && maintenance.updatedAt >= since) {
        const timeInfo = this.formatTimeAgo(maintenance.updatedAt);
        activities.push({
          id: `maintenance_edited_${maintenance.id}`,
          type: 'maintenance_edited',
          description: `Maintenance updated for ${maintenance.asset.brand.name} ${maintenance.asset.model.name} (${maintenance.asset.assetId})`,
          timestamp: maintenance.updatedAt,
          timeAgo: timeInfo.timeAgo,
          needsRealTimeUpdate: timeInfo.needsRealTimeUpdate,
          assetId: maintenance.asset.assetId,
          maintenanceId: maintenance.id.toString()
        });
      }
      
      // Maintenance completed
      if (maintenance.actualCompletionDate && maintenance.actualCompletionDate >= since) {
        const timeInfo = this.formatTimeAgo(maintenance.actualCompletionDate);
        activities.push({
          id: `maintenance_completed_${maintenance.id}`,
          type: 'maintenance_completed',
          description: `Maintenance completed for ${maintenance.asset.brand.name} ${maintenance.asset.model.name} (${maintenance.asset.assetId})`,
          timestamp: maintenance.actualCompletionDate,
          timeAgo: timeInfo.timeAgo,
          needsRealTimeUpdate: timeInfo.needsRealTimeUpdate,
          assetId: maintenance.asset.assetId,
          maintenanceId: maintenance.id.toString()
        });
      }
      
      // Maintenance cancelled
      if (maintenance.cancellationDate && maintenance.cancellationDate >= since) {
        const timeInfo = this.formatTimeAgo(maintenance.cancellationDate);
        activities.push({
          id: `maintenance_cancelled_${maintenance.id}`,
          type: 'maintenance_cancelled',
          description: `Maintenance cancelled for ${maintenance.asset.brand.name} ${maintenance.asset.model.name} (${maintenance.asset.assetId})`,
          timestamp: maintenance.cancellationDate,
          timeAgo: timeInfo.timeAgo,
          needsRealTimeUpdate: timeInfo.needsRealTimeUpdate,
          assetId: maintenance.asset.assetId,
          maintenanceId: maintenance.id.toString()
        });
      }
    }

    // Get recent vendor activities (added and edited)
    const recentVendors = await this.prisma.vendor.findMany({
      where: {
        OR: [
          { createdAt: { gte: since } },
          { updatedAt: { gte: since } }
        ]
      },
      include: {
        createdByUser: {
          include: {
            employee: true
          }
        },
        updatedByUser: {
          include: {
            employee: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    for (const vendor of recentVendors) {
      // Vendor added
      if (vendor.createdAt >= since) {
        const timeInfo = this.formatTimeAgo(vendor.createdAt);
        activities.push({
          id: `vendor_added_${vendor.id}`,
          type: 'vendor_added',
          description: `Vendor ${vendor.name} added`,
          timestamp: vendor.createdAt,
          timeAgo: timeInfo.timeAgo,
          needsRealTimeUpdate: timeInfo.needsRealTimeUpdate,
          vendorId: vendor.id.toString()
        });
      }
      
      // Vendor edited
      if (vendor.updatedAt > vendor.createdAt && vendor.updatedAt >= since) {
        const timeInfo = this.formatTimeAgo(vendor.updatedAt);
        activities.push({
          id: `vendor_edited_${vendor.id}`,
          type: 'vendor_edited',
          description: `Vendor ${vendor.name} updated`,
          timestamp: vendor.updatedAt,
          timeAgo: timeInfo.timeAgo,
          needsRealTimeUpdate: timeInfo.needsRealTimeUpdate,
          vendorId: vendor.id.toString()
        });
      }
    }

    // Sort all activities by timestamp (most recent first) and return top 20
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);
  }

  async getAssetInventoryReport(filters?: ReportFilters) {
    const whereClause: any = {};
    
    if (filters?.assetType) {
      whereClause.assetType = {
        name: filters.assetType,
      };
    }

    if (filters?.fromDate && filters?.toDate) {
      whereClause.purchaseDate = {
        gte: new Date(filters.fromDate),
        lte: new Date(filters.toDate),
      };
    }

    const assets = await this.prisma.asset.findMany({
      where: whereClause,
      include: {
        assetType: true,
        brand: true,
        model: true,
        vendor: true,
        assetIssues: {
          where: {
            returnDate: null, // Current assignment
          },
          include: {
            employee: true,
          },
          orderBy: {
            issueDate: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return assets.map(asset => ({
      id: asset.id.toString(),
      assetId: asset.assetId,
      type: asset.assetType.name,
      brand: asset.brand.name,
      model: asset.model.name,
      serialNumber: asset.serialNumber,
      status: asset.status,
      assignedTo: asset.assetIssues[0]?.employee 
        ? `${asset.assetIssues[0].employee.firstName} ${asset.assetIssues[0].employee.lastName}`
        : null,
      assignedEmail: asset.assetIssues[0]?.employee?.email || null,
      location: asset.location,
      purchaseDate: asset.purchaseDate,
      purchasePrice: Number(asset.purchaseCost || 0),
      vendor: asset.vendor?.name || null,
      warrantyExpiry: asset.warrantyEndDate,
    }));
  }

  async getEmployeeAssetReport(filters?: ReportFilters) {
    const employees = await this.prisma.employee.findMany({
      include: {
        assetIssues: {
          where: {
            returnDate: null, // Current assignments
          },
          include: {
            asset: {
              include: {
                assetType: true,
                brand: true,
                model: true,
              },
            },
          },
        },
      },
      orderBy: {
        firstName: 'asc',
      },
    });

    return employees.map(employee => ({
      employeeId: employee.employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      email: employee.email,
      department: 'N/A', // Not in current schema
      position: 'N/A', // Not in current schema
      totalAssetsAssigned: employee.assetIssues.length,
      totalAssetValue: employee.assetIssues.reduce((sum, issue) => sum + Number(issue.asset.purchaseCost || 0), 0),
      assets: employee.assetIssues.map(issue => ({
        assetId: issue.asset.assetId,
        type: issue.asset.assetType.name,
        brand: issue.asset.brand.name,
        model: issue.asset.model.name,
        serialNumber: issue.asset.serialNumber,
        value: Number(issue.asset.purchaseCost || 0),
      })),
    }));
  }

  async getMaintenanceReport(filters?: ReportFilters) {
    const whereClause: any = {
      // Only include COMPLETED records (has completion date, no cancellation date, and status is COMPLETED)
      status: 'COMPLETED',
      actualCompletionDate: { not: null },
      cancellationDate: null,
    };
    
    if (filters?.fromDate && filters?.toDate) {
      whereClause.scheduledDate = {
        gte: new Date(filters.fromDate),
        lte: new Date(filters.toDate),
      };
    }

    const maintenanceRecords = await this.prisma.maintenanceSchedule.findMany({
      where: whereClause,
      include: {
        asset: {
          include: {
            assetType: true,
            brand: true,
            model: true,
          },
        },
      },
      orderBy: {
        id: 'desc', // Sort by maintenance ID descending (bigger to smaller)
      },
    });

    return maintenanceRecords.map(record => ({
      maintenanceId: record.id.toString(),
      assetId: record.asset.assetId,
      assetType: record.asset.assetType.name,
      assetBrand: record.asset.brand.name,
      assetModel: record.asset.model.name,
      serialNumber: record.asset.serialNumber,
      maintenanceType: record.maintenanceType,
      description: record.description,
      scheduledDate: record.scheduledDate,
      completedDate: record.actualCompletionDate,
      status: record.status,
      cost: Number(record.actualCost || record.estimatedCost || 0),
      vendor: 'N/A',
      vendorContact: 'N/A',
      notes: record.completionNotes || record.cancellationNotes || 'N/A',
    }));
  }

  async exportToExcel(
    data: any[],
    reportType: string,
    res: Response,
    filters?: ReportFilters,
  ) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${reportType} Report`);

    // Set up headers based on report type
    let headers: string[] = [];
    
    switch (reportType.toLowerCase()) {
      case 'asset inventory':
        headers = [
          'Asset ID', 'Type', 'Brand', 'Model', 'Serial Number', 
          'Status', 'Assigned To', 'Location', 'Purchase Date', 
          'Purchase Price', 'Vendor', 'Warranty Expiry'
        ];
        break;
      case 'employee asset':
        headers = [
          'Employee Name', 'Email', 'Department', 'Position',
          'Total Assets', 'Total Value', 'Asset Details'
        ];
        break;
      case 'maintenance':
        headers = [
          'Asset ID', 'Asset Type', 'Brand', 'Model', 'Maintenance Type',
          'Description', 'Scheduled Date', 'Status', 'Cost', 'Vendor'
        ];
        break;
      default:
        headers = Object.keys(data[0] || {});
    }

    // Add headers
    worksheet.addRow(headers);

    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '331FEA' }, // Using the purple from your design
    };

    // Add data rows
    data.forEach(item => {
      let row: any[] = [];
      
      switch (reportType.toLowerCase()) {
        case 'asset inventory':
          row = [
            item.assetId, item.type, item.brand, item.model, item.serialNumber,
            item.status, item.assignedTo, item.location, item.purchaseDate,
            item.purchasePrice, item.vendor, item.warrantyExpiry
          ];
          break;
        case 'employee asset':
          row = [
            item.employeeName, item.email, item.department, item.position,
            item.totalAssetsAssigned, item.totalAssetValue,
            item.assets.map((a: any) => `${a.type}: ${a.brand} ${a.model}`).join('; ')
          ];
          break;
        case 'maintenance':
          row = [
            item.assetId, item.assetType, item.assetBrand, item.assetModel,
            item.maintenanceType, item.description, item.scheduledDate,
            item.status, item.cost, item.vendor
          ];
          break;
        default:
          row = Object.values(item);
      }
      
      worksheet.addRow(row);
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    // Set response headers
    const filename = `${reportType.replace(' ', '_').toLowerCase()}_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  }
}
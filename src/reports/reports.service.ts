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
  type: 'assigned' | 'maintenance' | 'added' | 'returned' | 'retired';
  description: string;
  timestamp: Date;
  assetId?: string;
  employeeId?: string;
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

    // Get recent activity from asset issues
    const recentAssetIssues = await this.prisma.assetIssue.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
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
      },
    });

    const recentActivity: RecentActivityData[] = recentAssetIssues.map(issue => ({
      id: issue.id.toString(),
      type: issue.returnDate ? 'returned' : 'assigned',
      description: `${issue.asset.brand.name} ${issue.asset.model.name} ${
        issue.returnDate 
          ? `returned by ${issue.employee.firstName} ${issue.employee.lastName}`
          : `assigned to ${issue.employee.firstName} ${issue.employee.lastName}`
      }`,
      timestamp: issue.createdAt,
      assetId: issue.asset.assetId,
      employeeId: issue.employee.employeeId,
    }));

    return {
      assetDistribution,
      statusOverview,
      totalValue,
      recentActivity,
    };
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
    const whereClause: any = {};
    
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
        vendor: true,
      },
      orderBy: {
        scheduledDate: 'desc',
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
      vendor: record.vendor?.name || 'N/A',
      vendorContact: record.vendor?.email || 'N/A',
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
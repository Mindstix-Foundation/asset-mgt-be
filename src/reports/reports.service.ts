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
  type:
    | 'asset_added'
    | 'asset_edited'
    | 'asset_issued'
    | 'asset_collected'
    | 'employee_added'
    | 'employee_edited'
    | 'maintenance_added'
    | 'maintenance_edited'
    | 'maintenance_completed'
    | 'maintenance_cancelled'
    | 'vendor_added'
    | 'vendor_edited';
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
  constructor(private readonly prisma: PrismaService) {}

  private formatTimeAgo(date: Date): {
    timeAgo: string;
    needsRealTimeUpdate: boolean;
  } {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return { timeAgo: 'Just now', needsRealTimeUpdate: true };
    }

    const thresholds = [
      {
        limit: 60 * 60,
        unit: 60,
        singular: 'minute',
        plural: 'minutes',
        realtime: true,
      },
      {
        limit: 24 * 60 * 60,
        unit: 60 * 60,
        singular: 'hour',
        plural: 'hours',
        realtime: false,
      },
      {
        limit: 7 * 24 * 60 * 60,
        unit: 24 * 60 * 60,
        singular: 'day',
        plural: 'days',
        realtime: false,
      },
      {
        limit: 4 * 7 * 24 * 60 * 60,
        unit: 7 * 24 * 60 * 60,
        singular: 'week',
        plural: 'weeks',
        realtime: false,
      },
      {
        limit: 12 * 30 * 24 * 60 * 60,
        unit: 30 * 24 * 60 * 60,
        singular: 'month',
        plural: 'months',
        realtime: false,
      },
    ] as const;

    for (const t of thresholds) {
      if (diffInSeconds < t.limit) {
        const amount = Math.floor(diffInSeconds / t.unit);
        const label =
          amount === 1 ? `1 ${t.singular} ago` : `${amount} ${t.plural} ago`;
        return { timeAgo: label, needsRealTimeUpdate: t.realtime };
      }
    }

    const years = Math.floor(diffInSeconds / (365 * 24 * 60 * 60));
    const label = years === 1 ? '1 year ago' : `${years} years ago`;
    return { timeAgo: label, needsRealTimeUpdate: false };
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

    const assetTypeMap = new Map(
      assetTypes.map((type) => [type.id, type.name]),
    );

    // Count only active assets (exclude RETIRED and LOST)
    const totalAssets = await this.prisma.asset.count({
      where: {
        status: {
          notIn: ['RETIRED', 'LOST'],
        },
      },
    });
    const totalValue = assetsByType.reduce(
      (sum, item) => sum + Number(item._sum.purchaseCost || 0),
      0,
    );

    const assetDistribution: AssetDistributionData[] = assetsByType.map(
      (item) => ({
        type: assetTypeMap.get(item.assetTypeId) || 'Unknown',
        count: item._count.id,
        percentage: Math.round((item._count.id / totalAssets) * 100),
        value: Number(item._sum.purchaseCost || 0),
      }),
    );

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

    const statusOverview: StatusOverviewData[] = assetsByStatus.map((item) => ({
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

  private async getRecentActivities(
    since: Date,
  ): Promise<RecentActivityData[]> {
    const activities: RecentActivityData[] = [];

    // Get recent asset activities (added and edited)
    const recentAssets = await this.prisma.asset.findMany({
      where: {
        OR: [{ createdAt: { gte: since } }, { updatedAt: { gte: since } }],
      },
      include: {
        assetType: true,
        brand: true,
        model: true,
        createdByUser: {
          include: {
            employee: true,
          },
        },
        updatedByUser: {
          include: {
            employee: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    for (const asset of recentAssets)
      activities.push(...this.activitiesFromAsset(asset, since));

    // Get recent asset issues (issued and collected)
    const recentAssetIssues = await this.prisma.assetIssue.findMany({
      where: {
        OR: [{ createdAt: { gte: since } }, { updatedAt: { gte: since } }],
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
            employee: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    for (const issue of recentAssetIssues)
      activities.push(...this.activitiesFromIssue(issue, since));

    // Get recent employee activities (added and edited)
    const recentEmployees = await this.prisma.employee.findMany({
      where: {
        OR: [{ createdAt: { gte: since } }, { updatedAt: { gte: since } }],
      },
      include: {
        createdByUser: {
          include: {
            employee: true,
          },
        },
        updatedByUser: {
          include: {
            employee: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    for (const employee of recentEmployees)
      activities.push(...this.activitiesFromEmployee(employee, since));

    // Get recent maintenance activities
    const recentMaintenance = await this.prisma.maintenanceSchedule.findMany({
      where: {
        OR: [
          { createdAt: { gte: since } },
          { updatedAt: { gte: since } },
          { actualCompletionDate: { gte: since } },
          { cancellationDate: { gte: since } },
        ],
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
            employee: true,
          },
        },
        updatedByUser: {
          include: {
            employee: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    for (const maintenance of recentMaintenance)
      activities.push(...this.activitiesFromMaintenance(maintenance, since));

    // Get recent vendor activities (added and edited)
    const recentVendors = await this.prisma.vendor.findMany({
      where: {
        OR: [{ createdAt: { gte: since } }, { updatedAt: { gte: since } }],
      },
      include: {
        createdByUser: {
          include: {
            employee: true,
          },
        },
        updatedByUser: {
          include: {
            employee: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    for (const vendor of recentVendors)
      activities.push(...this.activitiesFromVendor(vendor, since));

    // Sort all activities by timestamp (most recent first) and return top 20
    const sorted = activities.toSorted(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
    return sorted.slice(0, 20);
  }

  private buildActivity(
    idPrefix: string,
    type: RecentActivityData['type'],
    description: string,
    timestamp: Date,
    extra: Partial<RecentActivityData>,
  ): RecentActivityData {
    const timeInfo = this.formatTimeAgo(timestamp);
    return {
      id: `${idPrefix}`,
      type,
      description,
      timestamp,
      timeAgo: timeInfo.timeAgo,
      needsRealTimeUpdate: timeInfo.needsRealTimeUpdate,
      ...extra,
    } as RecentActivityData;
  }

  private activitiesFromAsset(asset: any, since: Date): RecentActivityData[] {
    const out: RecentActivityData[] = [];
    if (asset.createdAt >= since) {
      out.push(
        this.buildActivity(
          `asset_added_${asset.id}`,
          'asset_added',
          `${asset.brand.name} ${asset.model.name} (${asset.assetId}) added`,
          asset.createdAt,
          { assetId: asset.assetId },
        ),
      );
    }
    if (asset.updatedAt > asset.createdAt && asset.updatedAt >= since) {
      out.push(
        this.buildActivity(
          `asset_edited_${asset.id}`,
          'asset_edited',
          `${asset.brand.name} ${asset.model.name} (${asset.assetId}) updated`,
          asset.updatedAt,
          { assetId: asset.assetId },
        ),
      );
    }
    return out;
  }

  private activitiesFromIssue(issue: any, since: Date): RecentActivityData[] {
    const out: RecentActivityData[] = [];
    if (issue.createdAt >= since) {
      out.push(
        this.buildActivity(
          `asset_issued_${issue.id}`,
          'asset_issued',
          `${issue.asset.brand.name} ${issue.asset.model.name} (${issue.asset.assetId}) issued to ${issue.employee.firstName} ${issue.employee.lastName}`,
          issue.createdAt,
          {
            assetId: issue.asset.assetId,
            employeeId: issue.employee.employeeId,
          },
        ),
      );
    }
    if (
      issue.returnDate &&
      issue.updatedAt >= since &&
      issue.updatedAt > issue.createdAt
    ) {
      out.push(
        this.buildActivity(
          `asset_collected_${issue.id}`,
          'asset_collected',
          `${issue.asset.brand.name} ${issue.asset.model.name} (${issue.asset.assetId}) collected from ${issue.employee.firstName} ${issue.employee.lastName}`,
          issue.updatedAt,
          {
            assetId: issue.asset.assetId,
            employeeId: issue.employee.employeeId,
          },
        ),
      );
    }
    return out;
  }

  private activitiesFromEmployee(
    employee: any,
    since: Date,
  ): RecentActivityData[] {
    const out: RecentActivityData[] = [];
    if (employee.createdAt >= since) {
      out.push(
        this.buildActivity(
          `employee_added_${employee.id}`,
          'employee_added',
          `Employee ${employee.firstName} ${employee.lastName} (${employee.employeeId}) added`,
          employee.createdAt,
          { employeeId: employee.employeeId },
        ),
      );
    }
    if (
      employee.updatedAt > employee.createdAt &&
      employee.updatedAt >= since
    ) {
      out.push(
        this.buildActivity(
          `employee_edited_${employee.id}`,
          'employee_edited',
          `Employee ${employee.firstName} ${employee.lastName} (${employee.employeeId}) updated`,
          employee.updatedAt,
          { employeeId: employee.employeeId },
        ),
      );
    }
    return out;
  }

  private activitiesFromMaintenance(
    maintenance: any,
    since: Date,
  ): RecentActivityData[] {
    const out: RecentActivityData[] = [];
    if (maintenance.createdAt >= since) {
      out.push(
        this.buildActivity(
          `maintenance_added_${maintenance.id}`,
          'maintenance_added',
          `Maintenance scheduled for ${maintenance.asset.brand.name} ${maintenance.asset.model.name} (${maintenance.asset.assetId})`,
          maintenance.createdAt,
          {
            assetId: maintenance.asset.assetId,
            maintenanceId: maintenance.id.toString(),
          },
        ),
      );
    }
    if (
      maintenance.updatedAt > maintenance.createdAt &&
      maintenance.updatedAt >= since
    ) {
      out.push(
        this.buildActivity(
          `maintenance_edited_${maintenance.id}`,
          'maintenance_edited',
          `Maintenance updated for ${maintenance.asset.brand.name} ${maintenance.asset.model.name} (${maintenance.asset.assetId})`,
          maintenance.updatedAt,
          {
            assetId: maintenance.asset.assetId,
            maintenanceId: maintenance.id.toString(),
          },
        ),
      );
    }
    if (
      maintenance.actualCompletionDate &&
      maintenance.actualCompletionDate >= since
    ) {
      out.push(
        this.buildActivity(
          `maintenance_completed_${maintenance.id}`,
          'maintenance_completed',
          `Maintenance completed for ${maintenance.asset.brand.name} ${maintenance.asset.model.name} (${maintenance.asset.assetId})`,
          maintenance.actualCompletionDate,
          {
            assetId: maintenance.asset.assetId,
            maintenanceId: maintenance.id.toString(),
          },
        ),
      );
    }
    if (maintenance.cancellationDate && maintenance.cancellationDate >= since) {
      out.push(
        this.buildActivity(
          `maintenance_cancelled_${maintenance.id}`,
          'maintenance_cancelled',
          `Maintenance cancelled for ${maintenance.asset.brand.name} ${maintenance.asset.model.name} (${maintenance.asset.assetId})`,
          maintenance.cancellationDate,
          {
            assetId: maintenance.asset.assetId,
            maintenanceId: maintenance.id.toString(),
          },
        ),
      );
    }
    return out;
  }

  private activitiesFromVendor(vendor: any, since: Date): RecentActivityData[] {
    const out: RecentActivityData[] = [];
    if (vendor.createdAt >= since) {
      out.push(
        this.buildActivity(
          `vendor_added_${vendor.id}`,
          'vendor_added',
          `Vendor ${vendor.name} added`,
          vendor.createdAt,
          { vendorId: vendor.id.toString() },
        ),
      );
    }
    if (vendor.updatedAt > vendor.createdAt && vendor.updatedAt >= since) {
      out.push(
        this.buildActivity(
          `vendor_edited_${vendor.id}`,
          'vendor_edited',
          `Vendor ${vendor.name} updated`,
          vendor.updatedAt,
          { vendorId: vendor.id.toString() },
        ),
      );
    }
    return out;
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

    return assets.map((asset) => ({
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

    return employees.map((employee) => ({
      employeeId: employee.employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      email: employee.email,
      department: 'N/A', // Not in current schema
      position: 'N/A', // Not in current schema
      totalAssetsAssigned: employee.assetIssues.length,
      totalAssetValue: employee.assetIssues.reduce(
        (sum, issue) => sum + Number(issue.asset.purchaseCost || 0),
        0,
      ),
      assets: employee.assetIssues.map((issue) => ({
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

    return maintenanceRecords.map((record) => ({
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
          'Asset ID',
          'Type',
          'Brand',
          'Model',
          'Serial Number',
          'Status',
          'Assigned To',
          'Location',
          'Purchase Date',
          'Purchase Price',
          'Vendor',
          'Warranty Expiry',
        ];
        break;
      case 'employee asset':
        headers = [
          'Employee Name',
          'Email',
          'Department',
          'Position',
          'Total Assets',
          'Total Value',
          'Asset Details',
        ];
        break;
      case 'maintenance':
        headers = [
          'Asset ID',
          'Asset Type',
          'Brand',
          'Model',
          'Maintenance Type',
          'Description',
          'Scheduled Date',
          'Status',
          'Cost',
          'Vendor',
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
    for (const item of data) {
      let row: any[] = [];

      switch (reportType.toLowerCase()) {
        case 'asset inventory':
          row = [
            item.assetId,
            item.type,
            item.brand,
            item.model,
            item.serialNumber,
            item.status,
            item.assignedTo,
            item.location,
            item.purchaseDate,
            item.purchasePrice,
            item.vendor,
            item.warrantyExpiry,
          ];
          break;
        case 'employee asset':
          row = [
            item.employeeName,
            item.email,
            item.department,
            item.position,
            item.totalAssetsAssigned,
            item.totalAssetValue,
            item.assets
              .map((a: any) => `${a.type}: ${a.brand} ${a.model}`)
              .join('; '),
          ];
          break;
        case 'maintenance':
          row = [
            item.assetId,
            item.assetType,
            item.assetBrand,
            item.assetModel,
            item.maintenanceType,
            item.description,
            item.scheduledDate,
            item.status,
            item.cost,
            item.vendor,
          ];
          break;
        default:
          row = Object.values(item);
      }

      worksheet.addRow(row);
    }

    // Auto-fit columns
    for (const column of worksheet.columns) {
      column.width = 15;
    }

    // Set response headers
    const filename = `${reportType.replace(' ', '_').toLowerCase()}_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  }
}

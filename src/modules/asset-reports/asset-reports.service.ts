import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { GenerateReportDto } from './dto';

@Injectable()
export class AssetReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generateReport(generateReportDto: GenerateReportDto) {
    const { reportType, format, title, ...filters } = generateReportDto;

    try {
      let data: any[] = [];
      let headers: string[] = [];
      const reportTitle =
        title ||
        `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`;

      switch (reportType) {
        case 'assets':
          ({ data, headers } = await this.generateAssetsReport(filters));
          break;
        case 'assignments':
          ({ data, headers } = await this.generateAssignmentsReport(filters));
          break;
        case 'asset-categories':
          ({ data, headers } = await this.generateAssetCategoriesReport());
          break;
        case 'asset-types':
          ({ data, headers } = await this.generateAssetTypesReport());
          break;
        case 'brands':
          ({ data, headers } = await this.generateBrandsReport());
          break;
        case 'models':
          ({ data, headers } = await this.generateModelsReport());
          break;
        case 'employees':
          ({ data, headers } = await this.generateEmployeesReport());
          break;
        case 'vendors':
          ({ data, headers } = await this.generateVendorsReport());
          break;
        default:
          throw new BadRequestException(
            `Unsupported report type: ${reportType}`,
          );
      }

      // Generate file content based on format
      let fileContent: string;
      let mimeType: string;
      let fileName: string;

      switch (format) {
        case 'csv':
          fileContent = this.generateCSV(data, headers);
          mimeType = 'text/csv';
          fileName = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'excel':
          // For simplicity, we'll return CSV format with Excel MIME type
          // In production, you'd use a library like 'exceljs'
          fileContent = this.generateCSV(data, headers);
          mimeType =
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          fileName = `${reportType}-report-${new Date().toISOString().split('T')[0]}.xlsx`;
          break;
        case 'pdf':
          // For simplicity, we'll return a structured text format
          // In production, you'd use a library like 'pdfkit' or 'puppeteer'
          fileContent = this.generateTextReport(data, headers, reportTitle);
          mimeType = 'application/pdf';
          fileName = `${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`;
          break;
        default:
          throw new BadRequestException(`Unsupported format: ${format}`);
      }

      return {
        message: 'Report generated successfully',
        data: {
          reportType,
          format,
          title: reportTitle,
          fileName,
          mimeType,
          content: Buffer.from(fileContent).toString('base64'),
          recordCount: data.length,
          generatedAt: new Date().toISOString(),
          filters: filters,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Error generating report: ${error.message}`,
      );
    }
  }

  private async generateAssetsReport(filters: any) {
    const where: any = {};

    if (filters.assetTypeId) where.assetTypeId = filters.assetTypeId;
    if (filters.brandId) where.brandId = filters.brandId;
    if (filters.status) where.status = filters.status;
    if (filters.condition) where.condition = filters.condition;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const assets = await this.prisma.asset.findMany({
      where,
      include: {
        assetType: {
          select: {
            name: true,
            category: { select: { name: true } },
          },
        },
        brand: { select: { name: true } },
        model: { select: { name: true } },
        vendor: { select: { name: true } },
        createdByUser: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Asset ID',
      'Serial Number',
      'Category',
      'Asset Type',
      'Brand',
      'Model',
      'Condition',
      'Status',
      'Location',
      'Purchase Date',
      'Purchase Cost',
      'Vendor',
      'Notes',
      'Created By',
      'Created At',
    ];

    const data = assets.map((asset) => [
      asset.assetId,
      asset.serialNumber || '',
      asset.assetType.category.name,
      asset.assetType.name,
      asset.brand.name,
      asset.model.name,
      asset.condition,
      asset.status,
      asset.location || '',
      asset.purchaseDate ? asset.purchaseDate.toISOString().split('T')[0] : '',
      asset.purchaseCost || '',
      asset.vendor?.name || '',
      asset.notes || '',
      asset.createdByUser.username,
      asset.createdAt.toISOString().split('T')[0],
    ]);

    return { data, headers };
  }

  private async generateAssignmentsReport(filters: any) {
    const where: any = {};

    if (filters.active !== undefined) {
      where.returnDate = filters.active ? null : { not: null };
    }

    if (filters.startDate || filters.endDate) {
      where.issueDate = {};
      if (filters.startDate) where.issueDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.issueDate.lte = new Date(filters.endDate);
    }

    const assignments = await this.prisma.assetIssue.findMany({
      where,
      include: {
        asset: {
          select: {
            assetId: true,
            assetType: { select: { name: true } },
            brand: { select: { name: true } },
            model: { select: { name: true } },
          },
        },
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
        issuedByUser: { select: { username: true } },
      },
      orderBy: { issueDate: 'desc' },
    });

    const headers = [
      'Assignment ID',
      'Asset ID',
      'Asset Type',
      'Brand',
      'Model',
      'Employee ID',
      'Employee Name',
      'Issue Date',
      'Issue Condition',
      'Issue Reason',
      'Return Date',
      'Return Condition',
      'Return Reason',
      'Status',
      'Issued By',
    ];

    const data = assignments.map((assignment) => [
      assignment.id,
      assignment.asset.assetId,
      assignment.asset.assetType.name,
      assignment.asset.brand.name,
      assignment.asset.model.name,
      assignment.employee.employeeId,
      `${assignment.employee.firstName} ${assignment.employee.lastName}`,
      assignment.issueDate.toISOString().split('T')[0],
      assignment.issueCondition,
      assignment.issueReason || '',
      assignment.returnDate
        ? assignment.returnDate.toISOString().split('T')[0]
        : '',
      assignment.returnCondition || '',
      assignment.returnReason || '',
      assignment.returnDate ? 'RETURNED' : 'ACTIVE',
      assignment.issuedByUser.username,
    ]);

    return { data, headers };
  }

  private async generateAssetCategoriesReport() {
    const categories = await this.prisma.assetCategory.findMany({
      include: {
        createdByUser: { select: { username: true } },
        _count: { select: { assetTypes: true } },
      },
      orderBy: { name: 'asc' },
    });

    const headers = [
      'ID',
      'Name',
      'Description',
      'Asset Types Count',
      'Created By',
      'Created At',
    ];

    const data = categories.map((category) => [
      category.id,
      category.name,
      category.description || '',
      category._count.assetTypes,
      category.createdByUser.username,
      category.createdAt.toISOString().split('T')[0],
    ]);

    return { data, headers };
  }

  private async generateAssetTypesReport() {
    const assetTypes = await this.prisma.assetType.findMany({
      include: {
        category: { select: { name: true } },
        createdByUser: { select: { username: true } },
        _count: { select: { assets: true } },
      },
      orderBy: { name: 'asc' },
    });

    const headers = [
      'ID',
      'Name',
      'Category',
      'Description',
      'Assets Count',
      'Active',
      'Created By',
      'Created At',
    ];

    const data = assetTypes.map((type) => [
      type.id,
      type.name,
      type.category.name,
      type.description || '',
      type._count.assets,
      type.isActive ? 'Yes' : 'No',
      type.createdByUser.username,
      type.createdAt.toISOString().split('T')[0],
    ]);

    return { data, headers };
  }

  private async generateBrandsReport() {
    const brands = await this.prisma.brand.findMany({
      include: {
        createdByUser: { select: { username: true } },
        _count: { select: { assets: true, models: true } },
      },
      orderBy: { name: 'asc' },
    });

    const headers = [
      'ID',
      'Name',
      'Description',
      'Assets Count',
      'Models Count',
      'Created By',
      'Created At',
    ];

    const data = brands.map((brand) => [
      brand.id,
      brand.name,
      brand.description || '',
      brand._count.assets,
      brand._count.models,
      brand.createdByUser.username,
      brand.createdAt.toISOString().split('T')[0],
    ]);

    return { data, headers };
  }

  private async generateModelsReport() {
    const models = await this.prisma.model.findMany({
      include: {
        brand: { select: { name: true } },
        assetType: { select: { name: true } },
        createdByUser: { select: { username: true } },
        _count: { select: { assets: true } },
      },
      orderBy: { name: 'asc' },
    });

    const headers = [
      'ID',
      'Name',
      'Brand',
      'Asset Type',
      'Specifications',
      'Assets Count',
      'Created By',
      'Created At',
    ];

    const data = models.map((model) => [
      model.id,
      model.name,
      model.brand.name,
      model.assetType.name,
      model.specifications ? JSON.stringify(model.specifications) : '',
      model._count.assets,
      model.createdByUser.username,
      model.createdAt.toISOString().split('T')[0],
    ]);

    return { data, headers };
  }

  private async generateEmployeesReport() {
    const employees = await this.prisma.employee.findMany({
      include: {
        createdByUser: { select: { username: true } },
        _count: { select: { assetIssues: true } },
      },
      orderBy: { employeeId: 'asc' },
    });

    const headers = [
      'Employee ID',
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Date of Birth',
      'Address',
      'Status',
      'Active Assignments',
      'Created By',
      'Created At',
    ];

    const data = employees.map((employee) => [
      employee.employeeId,
      employee.firstName,
      employee.lastName,
      employee.email || '',
      employee.phone || '',
      employee.dateOfBirth
        ? employee.dateOfBirth.toISOString().split('T')[0]
        : '',
      employee.address || '',
      employee.status,
      employee._count.assetIssues,
      employee.createdByUser?.username || 'System',
      employee.createdAt.toISOString().split('T')[0],
    ]);

    return { data, headers };
  }

  private async generateVendorsReport() {
    const vendors = await this.prisma.vendor.findMany({
      include: {
        createdByUser: { select: { username: true } },
        _count: { select: { assets: true } },
      },
      orderBy: { name: 'asc' },
    });

    const headers = [
      'ID',
      'Name',
      'Contact Person',
      'Email',
      'Phone',
      'Address',
      'Assets Count',
      'Created By',
      'Created At',
    ];

    const data = vendors.map((vendor) => [
      vendor.id,
      vendor.name,
      vendor.contactPerson || '',
      vendor.email || '',
      vendor.phone || '',
      vendor.address || '',
      vendor._count.assets,
      vendor.createdByUser.username,
      vendor.createdAt.toISOString().split('T')[0],
    ]);

    return { data, headers };
  }

  private generateCSV(data: any[][], headers: string[]): string {
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const escapedRow = row.map((field) => {
        const stringField = String(field || '');
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (
          stringField.includes(',') ||
          stringField.includes('"') ||
          stringField.includes('\n')
        ) {
          return `"${stringField.replaceAll('"', '""')}"`;
        }
        return stringField;
      });
      csvRows.push(escapedRow.join(','));
    }

    return csvRows.join('\n');
  }

  private generateTextReport(
    data: any[][],
    headers: string[],
    title: string,
  ): string {
    let report = `${title}\n`;
    report += `Generated on: ${new Date().toLocaleString()}\n`;
    report += `Total Records: ${data.length}\n\n`;

    // Add headers
    report += headers.join(' | ') + '\n';
    report += '-'.repeat(headers.join(' | ').length) + '\n';

    // Add data rows
    for (const row of data) {
      report += row.join(' | ') + '\n';
    }

    return report;
  }
}

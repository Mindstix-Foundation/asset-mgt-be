import { 
  Controller, 
  Get, 
  Post, 
  Query, 
  Res, 
  UseGuards, 
  Body 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiQuery 
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService, type ReportFilters } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('analytics')
  @ApiOperation({ summary: 'Get analytics data for dashboard' })
  @ApiResponse({ status: 200, description: 'Analytics data retrieved successfully' })
  async getAnalytics() {
    const data = await this.reportsService.getAnalyticsData();
    return {
      message: 'Analytics data retrieved successfully',
      data,
    };
  }

  @Get('asset-inventory')
  @ApiOperation({ summary: 'Get asset inventory report data' })
  @ApiResponse({ status: 200, description: 'Asset inventory data retrieved successfully' })
  @ApiQuery({ name: 'assetType', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  async getAssetInventory(@Query() filters: ReportFilters) {
    const data = await this.reportsService.getAssetInventoryReport(filters);
    return {
      message: 'Asset inventory data retrieved successfully',
      data,
    };
  }

  @Get('employee-assets')
  @ApiOperation({ summary: 'Get employee asset report data' })
  @ApiResponse({ status: 200, description: 'Employee asset data retrieved successfully' })
  async getEmployeeAssets(@Query() filters: ReportFilters) {
    const data = await this.reportsService.getEmployeeAssetReport(filters);
    return {
      message: 'Employee asset data retrieved successfully',
      data,
    };
  }

  @Get('maintenance')
  @ApiOperation({ summary: 'Get maintenance report data' })
  @ApiResponse({ status: 200, description: 'Maintenance data retrieved successfully' })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  async getMaintenance(@Query() filters: ReportFilters) {
    const data = await this.reportsService.getMaintenanceReport(filters);
    return {
      message: 'Maintenance data retrieved successfully',
      data,
    };
  }

  @Post('export/asset-inventory')
  @ApiOperation({ summary: 'Export asset inventory report to Excel' })
  @ApiResponse({ status: 200, description: 'Excel file generated successfully' })
  async exportAssetInventory(
    @Body() filters: ReportFilters,
    @Res() res: Response,
  ) {
    const data = await this.reportsService.getAssetInventoryReport(filters);
    await this.reportsService.exportToExcel(data, 'Asset Inventory', res, filters);
  }

  @Post('export/employee-assets')
  @ApiOperation({ summary: 'Export employee asset report to Excel' })
  @ApiResponse({ status: 200, description: 'Excel file generated successfully' })
  async exportEmployeeAssets(
    @Body() filters: ReportFilters,
    @Res() res: Response,
  ) {
    const data = await this.reportsService.getEmployeeAssetReport(filters);
    await this.reportsService.exportToExcel(data, 'Employee Asset', res, filters);
  }

  @Post('export/maintenance')
  @ApiOperation({ summary: 'Export maintenance report to Excel' })
  @ApiResponse({ status: 200, description: 'Excel file generated successfully' })
  async exportMaintenance(
    @Body() filters: ReportFilters,
    @Res() res: Response,
  ) {
    const data = await this.reportsService.getMaintenanceReport(filters);
    await this.reportsService.exportToExcel(data, 'Maintenance', res, filters);
  }

  @Get('preview')
  @ApiOperation({ summary: 'Get preview data for reports' })
  @ApiResponse({ status: 200, description: 'Preview data retrieved successfully' })
  @ApiQuery({ name: 'reportType', required: true })
  @ApiQuery({ name: 'assetType', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  async getReportPreview(@Query() query: ReportFilters & { reportType: string }) {
    let data: any[] = [];
    
    switch (query.reportType) {
      case 'assets':
        data = await this.reportsService.getAssetInventoryReport(query);
        break;
      case 'employees':
        data = await this.reportsService.getEmployeeAssetReport(query);
        break;
      case 'maintenance':
        data = await this.reportsService.getMaintenanceReport(query);
        break;
      default:
        data = [];
    }

    // Return first 10 records for preview
    return {
      message: 'Preview data retrieved successfully',
      data: data.slice(0, 10),
      total: data.length,
    };
  }
}
import { Controller, Get, Post, Query, Res, Body, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService, type ReportFilters } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('analytics')
  @ApiOperation({ summary: 'Get analytics data for dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Analytics data retrieved successfully',
  })
  async getAnalytics(@Request() req: any) {
    const tenantId = req.user.tenantId as number;
    const data = await this.reportsService.getAnalyticsData(tenantId);
    return {
      message: 'Analytics data retrieved successfully',
      data,
    };
  }

  @Get('activities')
  @ApiOperation({
    summary: 'Get paginated admin audit activity feed',
    description:
      'Returns all admin/system activities (assets, asset issues, employees, maintenance, vendors) in reverse chronological order, paginated.',
  })
  @ApiResponse({
    status: 200,
    description: 'Activities retrieved successfully',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: '1-based page number (default 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default 20, max 100)',
  })
  async getActivities(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = req.user.tenantId as number;
    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Number(limit) : 20;
    const result = await this.reportsService.getAllActivitiesPaginated(
      pageNum,
      limitNum,
      tenantId,
    );
    return {
      message: 'Activities retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Get('asset-inventory')
  @ApiOperation({ summary: 'Get asset inventory report data' })
  @ApiResponse({
    status: 200,
    description: 'Asset inventory data retrieved successfully',
  })
  @ApiQuery({ name: 'assetType', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  async getAssetInventory(@Query() filters: ReportFilters, @Request() req: any) {
    const tenantId = req.user.tenantId as number;
    const data = await this.reportsService.getAssetInventoryReport(tenantId, filters);
    return {
      message: 'Asset inventory data retrieved successfully',
      data,
    };
  }

  @Get('employee-assets')
  @ApiOperation({ summary: 'Get employee asset report data' })
  @ApiResponse({
    status: 200,
    description: 'Employee asset data retrieved successfully',
  })
  async getEmployeeAssets(@Query() filters: ReportFilters, @Request() req: any) {
    const tenantId = req.user.tenantId as number;
    const data = await this.reportsService.getEmployeeAssetReport(tenantId, filters);
    return {
      message: 'Employee asset data retrieved successfully',
      data,
    };
  }

  @Get('maintenance')
  @ApiOperation({ summary: 'Get maintenance report data' })
  @ApiResponse({
    status: 200,
    description: 'Maintenance data retrieved successfully',
  })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  async getMaintenance(@Query() filters: ReportFilters, @Request() req: any) {
    const tenantId = req.user.tenantId as number;
    const data = await this.reportsService.getMaintenanceReport(tenantId, filters);
    return {
      message: 'Maintenance data retrieved successfully',
      data,
    };
  }

  @Post('export/asset-inventory')
  @ApiOperation({ summary: 'Export asset inventory report to Excel' })
  @ApiResponse({
    status: 200,
    description: 'Excel file generated successfully',
  })
  async exportAssetInventory(
    @Body() filters: ReportFilters,
    @Res() res: Response,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId as number;
    const data = await this.reportsService.getAssetInventoryReport(tenantId, filters);
    await this.reportsService.exportToExcel(
      data,
      'Asset Inventory',
      res,
      filters,
    );
  }

  @Post('export/employee-assets')
  @ApiOperation({ summary: 'Export employee asset report to Excel' })
  @ApiResponse({
    status: 200,
    description: 'Excel file generated successfully',
  })
  async exportEmployeeAssets(
    @Body() filters: ReportFilters,
    @Res() res: Response,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId as number;
    const data = await this.reportsService.getEmployeeAssetReport(tenantId, filters);
    await this.reportsService.exportToExcel(
      data,
      'Employee Asset',
      res,
      filters,
    );
  }

  @Post('export/maintenance')
  @ApiOperation({ summary: 'Export maintenance report to Excel' })
  @ApiResponse({
    status: 200,
    description: 'Excel file generated successfully',
  })
  async exportMaintenance(
    @Body() filters: ReportFilters,
    @Res() res: Response,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId as number;
    const data = await this.reportsService.getMaintenanceReport(tenantId, filters);
    await this.reportsService.exportToExcel(data, 'Maintenance', res, filters);
  }

  @Get('preview')
  @ApiOperation({ summary: 'Get preview data for reports' })
  @ApiResponse({
    status: 200,
    description: 'Preview data retrieved successfully',
  })
  @ApiQuery({ name: 'reportType', required: true })
  @ApiQuery({ name: 'assetType', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  async getReportPreview(
    @Query() query: ReportFilters & { reportType: string },
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId as number;
    let data: any[] = [];

    switch (query.reportType) {
      case 'assets':
        data = await this.reportsService.getAssetInventoryReport(tenantId, query);
        break;
      case 'employees':
        data = await this.reportsService.getEmployeeAssetReport(tenantId, query);
        break;
      case 'maintenance':
        data = await this.reportsService.getMaintenanceReport(tenantId, query);
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

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
  Put,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { MaintenanceQueryDto } from './dto/maintenance-query.dto';
import { MaintenanceExportQueryDto } from './dto/maintenance-export-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new maintenance schedule' })
  @ApiResponse({
    status: 201,
    description: 'Maintenance scheduled successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({
    status: 409,
    description: 'Asset already scheduled for maintenance on this date',
  })
  create(@Body() createMaintenanceDto: CreateMaintenanceDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    return this.maintenanceService.create(createMaintenanceDto, userId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all maintenance schedules with filtering and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Maintenances retrieved successfully',
  })
  findAll(@Query() query: MaintenanceQueryDto) {
    return this.maintenanceService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get maintenance statistics' })
  @ApiResponse({
    status: 200,
    description: 'Maintenance statistics retrieved successfully',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getStats() {
    const stats = await this.maintenanceService.getMaintenanceStats();
    return {
      message: 'Maintenance statistics retrieved successfully',
      data: stats,
    };
  }

  @Get('check-asset-availability')
  @ApiOperation({
    summary: 'Check if asset is available for maintenance on a specific date',
  })
  @ApiResponse({ status: 200, description: 'Asset availability checked' })
  checkAssetAvailability(
    @Query('assetId', ParseIntPipe) assetId: number,
    @Query('scheduledDate') scheduledDate: string,
    @Query('excludeMaintenanceId') excludeMaintenanceId?: string,
  ) {
    const excludeId = excludeMaintenanceId
      ? Number.parseInt(excludeMaintenanceId, 10)
      : undefined;
    return this.maintenanceService.checkAssetAvailability(
      assetId,
      scheduledDate,
      excludeId,
    );
  }

  @Get('export')
  @ApiOperation({ summary: 'Export completed maintenance records to Excel' })
  @ApiResponse({
    status: 200,
    description:
      'Excel file with completed maintenance records generated successfully',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async exportMaintenanceToExcel(
    @Query() queryDto: MaintenanceExportQueryDto,
    @Res() res: any,
  ) {
    try {
      const excelBuffer =
        await this.maintenanceService.exportMaintenanceToExcel(queryDto);

      // Set response headers
      const filename = `completed_maintenance_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.setHeader('Content-Length', excelBuffer.length);

      // Send the Excel file
      res.send(excelBuffer);
    } catch (error) {
      console.error('Error exporting maintenance:', error);
      res.status(500).json({
        message: 'Failed to export maintenance',
        error: error.message,
      });
    }
  }

  @Get('asset/:assetId/history')
  @ApiOperation({ summary: 'Get maintenance history for a specific asset' })
  @ApiResponse({
    status: 200,
    description: 'Maintenance history retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  getMaintenanceHistory(@Param('assetId') assetId: string) {
    return this.maintenanceService.getMaintenanceHistory(assetId);
  }

  @Get('asset/:assetId/history-events')
  @ApiOperation({
    summary:
      'Get per-event maintenance history for an asset (server-side filters/sort/pagination)',
  })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully' })
  getHistoryEvents(
    @Param('assetId') assetId: string,
    @Query()
    query: {
      status?: string;
      type?: string;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
      sortBy?: 'date' | 'status' | 'type';
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    },
  ) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 20;
    return this.maintenanceService.getHistoryEvents(assetId, {
      ...query,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific maintenance schedule by ID' })
  @ApiResponse({
    status: 200,
    description: 'Maintenance retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Maintenance not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.maintenanceService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a maintenance schedule' })
  @ApiResponse({ status: 200, description: 'Maintenance updated successfully' })
  @ApiResponse({ status: 404, description: 'Maintenance not found' })
  @ApiResponse({
    status: 409,
    description: 'Asset already scheduled for maintenance on this date',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMaintenanceDto: UpdateMaintenanceDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    return this.maintenanceService.update(id, updateMaintenanceDto, userId);
  }

  @Put(':id/complete')
  @ApiOperation({ summary: 'Complete a maintenance schedule' })
  @ApiResponse({
    status: 200,
    description: 'Maintenance completed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Only scheduled or in-progress maintenance can be completed',
  })
  @ApiResponse({ status: 404, description: 'Maintenance not found' })
  completeMaintenance(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { actualCost: number; completionNotes?: string },
    @Req() req: any,
  ) {
    return this.maintenanceService.completeMaintenance(
      id,
      body.actualCost,
      body.completionNotes,
      req.user.userId,
    );
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel a maintenance schedule' })
  @ApiResponse({
    status: 200,
    description: 'Maintenance cancelled successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot cancel completed or already cancelled maintenance',
  })
  @ApiResponse({ status: 404, description: 'Maintenance not found' })
  cancelMaintenance(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { cancelNotes: string },
    @Req() req: any,
  ) {
    return this.maintenanceService.cancelMaintenance(
      id,
      undefined, // cancelDate - not used anymore
      body.cancelNotes,
      req.user.userId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a maintenance schedule (soft delete)' })
  @ApiResponse({ status: 200, description: 'Maintenance deleted successfully' })
  @ApiResponse({ status: 404, description: 'Maintenance not found' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.maintenanceService.remove(id, req.user.userId);
  }
}

// Additional controllers for related data
@ApiTags('maintenance-types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('maintenance-types')
export class MaintenanceTypesController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  @ApiOperation({ summary: 'Get all maintenance types' })
  @ApiResponse({
    status: 200,
    description: 'Maintenance types retrieved successfully',
  })
  getMaintenanceTypes() {
    return this.maintenanceService.getMaintenanceTypes();
  }
}

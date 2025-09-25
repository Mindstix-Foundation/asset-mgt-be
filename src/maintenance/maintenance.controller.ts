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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { MaintenanceQueryDto } from './dto/maintenance-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new maintenance schedule' })
  @ApiResponse({ status: 201, description: 'Maintenance scheduled successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({ status: 409, description: 'Asset already scheduled for maintenance on this date' })
  create(@Body() createMaintenanceDto: CreateMaintenanceDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    return this.maintenanceService.create(createMaintenanceDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all maintenance schedules with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Maintenances retrieved successfully' })
  findAll(@Query() query: MaintenanceQueryDto) {
    return this.maintenanceService.findAll(query);
  }

  @Get('check-asset-availability')
  @ApiOperation({ summary: 'Check if asset is available for maintenance on a specific date' })
  @ApiResponse({ status: 200, description: 'Asset availability checked' })
  checkAssetAvailability(
    @Query('assetId', ParseIntPipe) assetId: number,
    @Query('scheduledDate') scheduledDate: string,
    @Query('excludeMaintenanceId') excludeMaintenanceId?: string,
  ) {
    const excludeId = excludeMaintenanceId ? parseInt(excludeMaintenanceId) : undefined;
    return this.maintenanceService.checkAssetAvailability(assetId, scheduledDate, excludeId);
  }

  @Get('asset/:assetId/history')
  @ApiOperation({ summary: 'Get maintenance history for a specific asset' })
  @ApiResponse({ status: 200, description: 'Maintenance history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  getMaintenanceHistory(@Param('assetId') assetId: string) {
    return this.maintenanceService.getMaintenanceHistory(assetId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific maintenance schedule by ID' })
  @ApiResponse({ status: 200, description: 'Maintenance retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Maintenance not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.maintenanceService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a maintenance schedule' })
  @ApiResponse({ status: 200, description: 'Maintenance updated successfully' })
  @ApiResponse({ status: 404, description: 'Maintenance not found' })
  @ApiResponse({ status: 409, description: 'Asset already scheduled for maintenance on this date' })
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
  @ApiResponse({ status: 200, description: 'Maintenance completed successfully' })
  @ApiResponse({ status: 400, description: 'Only scheduled or in-progress maintenance can be completed' })
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
  @ApiResponse({ status: 200, description: 'Maintenance cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cannot cancel completed or already cancelled maintenance' })
  @ApiResponse({ status: 404, description: 'Maintenance not found' })
  cancelMaintenance(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { cancelDate: string; cancelNotes: string },
    @Req() req: any,
  ) {
    return this.maintenanceService.cancelMaintenance(
      id,
      body.cancelDate,
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
  @ApiResponse({ status: 200, description: 'Maintenance types retrieved successfully' })
  getMaintenanceTypes() {
    return this.maintenanceService.getMaintenanceTypes();
  }
} 
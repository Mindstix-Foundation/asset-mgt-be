import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AssetHistoryService } from './asset-history.service';
import { AssetHistoryQueryDto } from './dto';

@ApiTags('asset-history')
@ApiBearerAuth('JWT-auth')
@Controller('asset-history')
export class AssetHistoryController {
  constructor(private readonly assetHistoryService: AssetHistoryService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Get complete asset history with pagination and filtering',
  })
  @ApiParam({ name: 'id', description: 'Asset ID or Asset Code' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Events per page (default: 20, max: 100)',
  })
  @ApiQuery({
    name: 'eventTypes',
    required: false,
    description: 'Filter by event types (comma-separated)',
    example: 'ASSET_ASSIGNED,ASSET_RETURNED,MAINTENANCE_SCHEDULED',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    description: 'Filter events from date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    description: 'Filter events to date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user who performed action',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search in event descriptions and notes',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort by field (date, eventType)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (asc, desc)',
  })
  @ApiResponse({
    status: 200,
    description: 'Asset history retrieved successfully',
    schema: {
      example: {
        timestamp: '2025-01-30T12:00:00.000Z',
        description: 'Asset history retrieved successfully',
        asset: {
          id: 1,
          assetId: 'AST-0001',
          name: 'Laptop - Dell XPS 13',
          currentStatus: 'ASSIGNED',
          currentCondition: 'WORKING_CONDITION',
        },
        timeline: [
          {
            id: 'issue-1-asset_issued',
            type: 'ASSET_ISSUED',
            dateIST: '30/01/2025, 16:00:00',
            description: 'issue to John Doe (EMP-001)',
            userDisplayName: 'Jane Smith',
            details: {
              employee: 'John Doe',
              employeeId: 'EMP-001',
              businessDate: '2025-01-30',
              reason: 'New employee onboarding',
              notes: 'Laptop for development work',
            },
            icon: 'fas fa-user-plus',
            color: '#007bff',
            status: 'NON_ASSIGNED → ASSIGNED',
            condition: 'WORKING_CONDITION',
          },
          {
            id: 'issue-1-asset_collected',
            type: 'ASSET_COLLECTED',
            dateIST: '24/01/2025, 17:30:00',
            description: 'collected from Alice Johnson (EMP-002)',
            userDisplayName: 'Bob Miller',
            details: {
              employee: 'Alice Johnson',
              employeeId: 'EMP-002',
              businessDate: '2025-01-24',
              returnReason: 'Employee leaving company',
              notes: 'Asset returned in good condition',
            },
            icon: 'fas fa-user-minus',
            color: '#6c757d',
            status: 'ASSIGNED → NON_ASSIGNED',
            condition: 'WORKING_CONDITION',
          },
          {
            id: 'event-123',
            type: 'ASSET_UPDATED',
            dateIST: '21/01/2025, 14:15:00',
            description: 'Asset details updated',
            userDisplayName: 'John Admin',
            details: {
              changes: [
                {
                  field: 'location',
                  change: 'Office A → Office B',
                },
                {
                  field: 'condition',
                  change: 'NEEDS_REPAIR → WORKING_CONDITION',
                },
              ],
              totalChanges: 2,
            },
            icon: 'fas fa-edit',
            color: '#007bff',
            status: 'NON_ASSIGNED',
            condition: 'NEEDS_REPAIR → WORKING_CONDITION',
          },
        ],
        pagination: {
          currentPage: 1,
          totalPages: 5,
          totalEvents: 89,
          hasNext: true,
          hasPrevious: false,
          limit: 20,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async getAssetHistory(
    @Param('id') id: string,
    @Query() query: AssetHistoryQueryDto,
  ) {
    return this.assetHistoryService.getAssetHistory(id, query);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get asset history summary with key statistics' })
  @ApiParam({ name: 'id', description: 'Asset ID or Asset Code' })
  @ApiQuery({
    name: '_t',
    required: false,
    description: 'Cache busting parameter (timestamp)',
  })
  @ApiQuery({
    name: 'eventTypes',
    required: false,
    description: 'Filter by event types (comma-separated)',
    example: 'ASSET_ASSIGNED,ASSET_RETURNED,MAINTENANCE_SCHEDULED',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    description: 'Filter events from date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    description: 'Filter events to date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search in event descriptions and notes',
  })
  @ApiResponse({
    status: 200,
    description: 'Asset history summary retrieved successfully',
    schema: {
      example: {
        timestamp: '2025-01-30T12:00:00.000Z',
        description: 'Asset history summary retrieved successfully',
        asset: {
          id: 1,
          assetId: 'AST-0001',
          name: 'Laptop - Dell XPS 13',
          currentStatus: 'ASSIGNED',
          currentCondition: 'WORKING_CONDITION',
        },
        summary: {
          totalEvents: 10,
          lastActivity: '2025-01-30T10:30:00.000Z',
          currentStatus: 'ASSIGNED',
          currentCondition: 'WORKING_CONDITION',
          totalAssignments: 2,
          totalMaintenance: 4,
          totalStatusChanges: 2,
          totalCost: 1250,
          eventCounts: {
            ASSET_CREATED: 1,
            ASSET_UPDATED: 1,
            ASSET_ISSUED: 1,
            ASSET_COLLECTED: 1,
            MAINTENANCE_SCHEDULED: 1,
            MAINTENANCE_UPDATED: 1,
            MAINTENANCE_COMPLETED: 1,
            MAINTENANCE_CANCELLED: 1,
            ASSET_RETIRED: 1,
            ASSET_REACTIVATED: 1,
          },
        },
        recentEvents: [
          {
            id: 'event-10-asset_issued',
            type: 'ASSET_ISSUED',
            dateIST: '30/01/2025, 16:00:00',
            description: 'issue to John Doe (EMP-001)',
            userDisplayName: 'Jane Smith',
            details: {
              employee: 'John Doe',
              employeeId: 'EMP-001',
              businessDate: '2025-01-30',
              reason: 'New employee onboarding',
              notes: 'Laptop for development work',
            },
            icon: 'fas fa-user-plus',
            color: '#007bff',
            status: 'NON_ASSIGNED → ASSIGNED',
            condition: 'WORKING_CONDITION',
          },
        ],
        quickStats: {
          mostCommonStatus: 'ASSIGNED',
          mostCommonCondition: 'WORKING_CONDITION',
          maintenanceFrequency: 'Every 6 months',
          avgAssignmentDuration: '45 days',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async getAssetHistorySummary(
    @Param('id') id: string,
    @Query() query: AssetHistoryQueryDto,
  ) {
    return this.assetHistoryService.getAssetHistorySummary(id, query);
  }
}

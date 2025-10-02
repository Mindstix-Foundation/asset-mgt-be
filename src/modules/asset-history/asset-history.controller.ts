import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AssetHistoryService } from './asset-history.service';
import { AssetHistoryQueryDto } from './dto';

@ApiTags('asset-history')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('asset-history')
export class AssetHistoryController {
  constructor(
    private readonly assetHistoryService: AssetHistoryService
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get complete asset history with pagination and filtering' })
  @ApiParam({ name: 'id', description: 'Asset ID or Asset Code' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Events per page (default: 20, max: 100)' })
  @ApiQuery({ name: 'eventTypes', required: false, description: 'Filter by event types (comma-separated)' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter events from date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter events to date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user who performed action' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in event descriptions and notes' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort by field (date, eventType)' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order (asc, desc)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Asset history retrieved successfully',
    schema: {
      example: {
        message: 'Asset history retrieved successfully',
        data: {
          asset: {
            id: 1,
            assetId: 'AST-0001',
            name: 'Laptop - Dell XPS 13',
            currentStatus: 'ASSIGNED',
            currentCondition: 'GOOD'
          },
          timeline: [
            {
              id: 'assigned-123',
              type: 'ASSIGNED',
              date: '2024-02-01T09:15:00Z',
              dateIST: '01/02/2024, 14:45:00',
              title: 'Asset Assigned',
              description: 'Assigned to John Doe (EMP-001)',
              user: 'hr_manager',
              details: {
                employee: 'John Doe',
                employeeId: 'EMP-001',
                reason: 'New employee onboarding',
                notes: 'Laptop for development work',
                timestampIST: '01/02/2024, 14:45:00'
              },
              icon: 'fas fa-user-plus',
              color: '#007bff'
            }
          ],
          pagination: {
            currentPage: 1,
            totalPages: 5,
            totalEvents: 89,
            hasNext: true,
            hasPrevious: false,
            limit: 20
          }
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async getAssetHistory(@Param('id') id: string, @Query() query: AssetHistoryQueryDto) {
    return this.assetHistoryService.getAssetHistory(id, query);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get asset history summary with key statistics' })
  @ApiParam({ name: 'id', description: 'Asset ID or Asset Code' })
  @ApiQuery({ name: '_t', required: false, description: 'Cache busting parameter (timestamp)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Asset history summary retrieved successfully',
    schema: {
      example: {
        message: 'Asset history summary retrieved successfully',
        data: {
          asset: {
            id: 1,
            assetId: 'AST-0001',
            name: 'Laptop - Dell XPS 13',
            currentStatus: 'ASSIGNED',
            currentCondition: 'GOOD'
          },
          summary: {
            totalEvents: 89,
            lastActivity: '2024-12-15T10:30:00Z',
            currentStatus: 'ASSIGNED',
            currentCondition: 'GOOD',
            totalAssignments: 23,
            totalMaintenance: 8,
            totalStatusChanges: 12,
            totalCost: 2500.00
          },
          recentEvents: [
            {
              id: 'assigned-123',
              type: 'ASSIGNED',
              date: '2024-12-15T10:30:00Z',
              dateIST: '15/12/2024, 16:00:00',
              title: 'Asset Assigned',
              description: 'Assigned to John Doe (EMP-001)',
              user: 'hr_manager',
              details: {
                timestampIST: '15/12/2024, 16:00:00'
              },
              icon: 'fas fa-user-plus',
              color: '#007bff'
            }
          ],
          quickStats: {
            avgAssignmentDuration: '45 days',
            maintenanceFrequency: 'Every 6 months',
            mostCommonStatus: 'ASSIGNED'
          }
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async getAssetHistorySummary(@Param('id') id: string, @Query() query: AssetHistoryQueryDto) {
    return this.assetHistoryService.getAssetHistorySummary(id);
  }
}

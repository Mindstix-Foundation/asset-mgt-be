import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AssetAuditService } from './asset-audit.service';
import { 
  AssetHistoryQueryDto, 
  AssetEventType,
  AssetHistoryResponseDto,
  AssetHistorySummaryResponseDto,
  AssetHistoryEventDto,
  AssetBasicInfoDto,
  AssetHistorySummaryDto
} from './dto';

@Injectable()
export class AssetHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetAuditService: AssetAuditService
  ) {}

  async getAssetHistory(assetId: string, query: AssetHistoryQueryDto) {
    try {
      // Find asset by assetId or numeric id
      const asset = await this.findAssetByIdOrAssetId(assetId);
      
      if (!asset) {
        throw new NotFoundException('Asset not found');
      }

      // Get all events for this asset
      const events = await this.aggregateAssetEvents(asset.id, query);
      
      // Apply pagination
      const { page = 1, limit = 20 } = query;
      const skip = (page - 1) * limit;
      const paginatedEvents = events.slice(skip, skip + limit);

      // Build response
      return {
        message: 'Asset history retrieved successfully',
        data: {
          asset: this.buildAssetBasicInfo(asset),
          timeline: paginatedEvents,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(events.length / limit),
            totalEvents: events.length,
            hasNext: skip + limit < events.length,
            hasPrevious: page > 1,
            limit
          }
        }
      };
    } catch (error) {
      console.error('❌ Error in AssetHistoryService.getAssetHistory:', {
        error: error.message,
        assetId,
        query,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async getAssetHistorySummary(assetId: string) {
    try {
      // Find asset
      const asset = await this.findAssetByIdOrAssetId(assetId);
      
      if (!asset) {
        throw new NotFoundException('Asset not found');
      }

      // Get all events (no pagination for summary)
      const allEvents = await this.aggregateAssetEvents(asset.id, {});
      
      // Get recent 5 events
      const recentEvents = allEvents.slice(0, 5);

      // Calculate summary statistics
      const summary = await this.calculateSummaryStats(asset.id, allEvents);

      // Calculate quick stats
      const quickStats = await this.calculateQuickStats(asset.id);

      return {
        message: 'Asset history summary retrieved successfully',
        data: {
          asset: this.buildAssetBasicInfo(asset),
          summary,
          recentEvents,
          quickStats
        }
      };
    } catch (error) {
      console.error('❌ Error in AssetHistoryService.getAssetHistorySummary:', {
        error: error.message,
        assetId,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  private async findAssetByIdOrAssetId(assetId: string) {
    const isNumeric = /^\d+$/.test(assetId);
    
    return await this.prisma.asset.findUnique({
      where: isNumeric ? { id: parseInt(assetId) } : { assetId },
      include: {
        assetType: { select: { name: true } },
        brand: { select: { name: true } },
        model: { select: { name: true } }
      }
    });
  }

  private async aggregateAssetEvents(assetId: number, query: AssetHistoryQueryDto): Promise<AssetHistoryEventDto[]> {
    const events: AssetHistoryEventDto[] = [];

    // 1. Asset Creation Event
    const assetCreation = await this.getAssetCreationEvent(assetId);
    if (assetCreation) events.push(assetCreation);

    // 2. Assignment Events
    const assignmentEvents = await this.getAssignmentEvents(assetId, query);
    events.push(...assignmentEvents);

    // 3. Maintenance Events
    const maintenanceEvents = await this.getMaintenanceEvents(assetId, query);
    events.push(...maintenanceEvents);

    // 4. Asset Update Events (status, condition, location changes)
    const auditEvents = await this.getAuditEvents(assetId, query);
    events.push(...auditEvents);

    // Filter by event types if specified
    let filteredEvents = events;
    if (query.eventTypes && query.eventTypes.length > 0) {
      filteredEvents = events.filter(event => query.eventTypes!.includes(event.type));
    }

    // Filter by date range
    if (query.dateFrom) {
      const fromDate = new Date(query.dateFrom);
      filteredEvents = filteredEvents.filter(event => new Date(event.date) >= fromDate);
    }

    if (query.dateTo) {
      const toDate = new Date(query.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filteredEvents = filteredEvents.filter(event => new Date(event.date) <= toDate);
    }

    // Filter by user
    if (query.userId) {
      filteredEvents = filteredEvents.filter(event => event.userId === query.userId);
    }

    // Filter by search
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filteredEvents = filteredEvents.filter(event => 
        event.title.toLowerCase().includes(searchLower) ||
        event.description.toLowerCase().includes(searchLower) ||
        (event.details.notes && event.details.notes.toLowerCase().includes(searchLower))
      );
    }

    // Sort events
    filteredEvents.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      if (query.sortBy === 'eventType') {
        const typeComparison = a.type.localeCompare(b.type);
        if (typeComparison !== 0) {
          return query.sortOrder === 'asc' ? typeComparison : -typeComparison;
        }
      }
      
      // Default to date sorting
      return query.sortOrder === 'asc' 
        ? dateA.getTime() - dateB.getTime()
        : dateB.getTime() - dateA.getTime();
    });

    return filteredEvents;
  }

  private async getAssetCreationEvent(assetId: number): Promise<AssetHistoryEventDto | null> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        createdByUser: { select: { username: true } },
        updatedByUser: { select: { username: true } }
      }
    });

    if (!asset) return null;

    const events: AssetHistoryEventDto[] = [];

    // Asset Creation Event
    events.push({
      id: `asset-created-${asset.id}`,
      type: AssetEventType.ASSET_CREATED,
      date: asset.createdAt.toISOString(),
      title: 'Asset Created',
      description: `Asset ${asset.assetId} was created in the system`,
      user: asset.createdByUser.username,
      userId: asset.createdBy,
      details: {
        initialCondition: asset.condition,
        initialStatus: asset.status,
        purchaseDate: asset.purchaseDate?.toISOString().split('T')[0],
        purchaseCost: asset.purchaseCost ? parseFloat(asset.purchaseCost.toString()) : null,
        location: asset.location,
        serialNumber: asset.serialNumber,
        notes: asset.notes
      },
      icon: 'fas fa-plus-circle',
      color: '#28a745'
    });

    // Retirement Event (if retired)
    if (asset.retirementDate) {
      events.push({
        id: `asset-retired-${asset.id}`,
        type: AssetEventType.RETIRED,
        date: asset.retirementDate.toISOString(),
        title: 'Asset Retired',
        description: `Asset ${asset.assetId} was retired from service`,
        user: asset.updatedByUser?.username || 'System',
        userId: asset.updatedBy,
        details: {
          reason: asset.retirementReason,
          retirementDate: asset.retirementDate.toISOString().split('T')[0]
        },
        icon: 'fas fa-archive',
        color: '#6f42c1'
      });
    }

    // Reactivation Event (if reactivated)
    if (asset.reactivationDate) {
      events.push({
        id: `asset-reactivated-${asset.id}`,
        type: AssetEventType.REACTIVATED,
        date: asset.reactivationDate.toISOString(),
        title: 'Asset Reactivated',
        description: `Asset ${asset.assetId} was reactivated and returned to service`,
        user: asset.updatedByUser?.username || 'System',
        userId: asset.updatedBy,
        details: {
          reason: asset.reactivationReason,
          reactivationDate: asset.reactivationDate.toISOString().split('T')[0]
        },
        icon: 'fas fa-undo',
        color: '#17a2b8'
      });
    }

    // Return the first event (creation) for now, but we should modify the calling function
    // to handle multiple events from this method
    return events[0];
  }

  private async getAssignmentEvents(assetId: number, query: AssetHistoryQueryDto): Promise<AssetHistoryEventDto[]> {
    const assignments = await this.prisma.assetIssue.findMany({
      where: { assetId },
      include: {
        employee: { 
          select: { 
            employeeId: true, 
            firstName: true, 
            lastName: true 
          } 
        },
        issuedByUser: { select: { username: true } },
        updatedByUser: { select: { username: true } }
      },
      orderBy: { issueDate: 'desc' }
    });

    const events: AssetHistoryEventDto[] = [];

    for (const assignment of assignments) {
      // Assignment event
      events.push({
        id: `assigned-${assignment.id}`,
        type: AssetEventType.ASSIGNED,
        date: assignment.issueDate.toISOString(),
        title: 'Asset Assigned',
        description: `Assigned to ${assignment.employee.firstName} ${assignment.employee.lastName} (${assignment.employee.employeeId})`,
        user: assignment.issuedByUser.username,
        userId: assignment.issuedBy,
        details: {
          employee: `${assignment.employee.firstName} ${assignment.employee.lastName}`,
          employeeId: assignment.employee.employeeId,
          reason: assignment.issueReason,
          notes: assignment.notes,
          condition: assignment.issueCondition
        },
        icon: 'fas fa-user-plus',
        color: '#007bff'
      });

      // Return event (if returned)
      if (assignment.returnDate) {
        events.push({
          id: `returned-${assignment.id}`,
          type: AssetEventType.RETURNED,
          date: assignment.returnDate.toISOString(),
          title: 'Asset Returned',
          description: `Returned by ${assignment.employee.firstName} ${assignment.employee.lastName} (${assignment.employee.employeeId})`,
          user: assignment.updatedByUser?.username,
          userId: assignment.updatedBy,
          details: {
            employee: `${assignment.employee.firstName} ${assignment.employee.lastName}`,
            employeeId: assignment.employee.employeeId,
            reason: assignment.returnReason,
            condition: assignment.returnCondition,
            notes: assignment.notes
          },
          icon: 'fas fa-user-minus',
          color: '#6c757d'
        });
      }
    }

    return events;
  }

  private async getMaintenanceEvents(assetId: number, query: AssetHistoryQueryDto): Promise<AssetHistoryEventDto[]> {
    const maintenances = await this.prisma.maintenanceSchedule.findMany({
      where: { 
        assetId,
        isActive: true 
      },
      include: {
        vendor: { select: { name: true } },
        createdByUser: { select: { username: true } },
        updatedByUser: { select: { username: true } }
      },
      orderBy: { scheduledDate: 'desc' }
    });

    const events: AssetHistoryEventDto[] = [];

    for (const maintenance of maintenances) {
      // Scheduled event
      events.push({
        id: `maintenance-scheduled-${maintenance.id}`,
        type: AssetEventType.MAINTENANCE_SCHEDULED,
        date: maintenance.createdAt.toISOString(),
        title: 'Maintenance Scheduled',
        description: `${maintenance.maintenanceType.toLowerCase().replace('_', ' ')} maintenance scheduled`,
        user: maintenance.createdByUser.username,
        userId: maintenance.createdBy,
        details: {
          type: maintenance.maintenanceType,
          scheduledDate: maintenance.scheduledDate.toISOString().split('T')[0],
          description: maintenance.description,
          vendor: maintenance.vendor?.name,
          estimatedCost: maintenance.estimatedCost ? parseFloat(maintenance.estimatedCost.toString()) : null,
          status: maintenance.status
        },
        icon: 'fas fa-calendar-plus',
        color: '#ffc107'
      });

      // Started event
      if (maintenance.actualStartDate) {
        events.push({
          id: `maintenance-started-${maintenance.id}`,
          type: AssetEventType.MAINTENANCE_STARTED,
          date: maintenance.actualStartDate.toISOString(),
          title: 'Maintenance Started',
          description: `${maintenance.maintenanceType.toLowerCase().replace('_', ' ')} maintenance started`,
          user: maintenance.updatedByUser?.username,
          userId: maintenance.updatedBy,
          details: {
            type: maintenance.maintenanceType,
            description: maintenance.description,
            vendor: maintenance.vendor?.name
          },
          icon: 'fas fa-tools',
          color: '#fd7e14'
        });
      }

      // Completed event
      if (maintenance.status === 'COMPLETED' && maintenance.actualCompletionDate) {
        events.push({
          id: `maintenance-completed-${maintenance.id}`,
          type: AssetEventType.MAINTENANCE_COMPLETED,
          date: maintenance.actualCompletionDate.toISOString(),
          title: 'Maintenance Completed',
          description: `${maintenance.maintenanceType.toLowerCase().replace('_', ' ')} maintenance completed`,
          user: maintenance.updatedByUser?.username,
          userId: maintenance.updatedBy,
          details: {
            type: maintenance.maintenanceType,
            description: maintenance.description,
            vendor: maintenance.vendor?.name,
            actualCost: maintenance.actualCost ? parseFloat(maintenance.actualCost.toString()) : null,
            completionNotes: maintenance.completionNotes
          },
          icon: 'fas fa-check-circle',
          color: '#28a745'
        });
      }

      // Cancelled event
      if (maintenance.status === 'CANCELLED' && maintenance.cancellationDate) {
        events.push({
          id: `maintenance-cancelled-${maintenance.id}`,
          type: AssetEventType.MAINTENANCE_CANCELLED,
          date: maintenance.cancellationDate.toISOString(),
          title: 'Maintenance Cancelled',
          description: `${maintenance.maintenanceType.toLowerCase().replace('_', ' ')} maintenance cancelled`,
          user: maintenance.updatedByUser?.username,
          userId: maintenance.updatedBy,
          details: {
            type: maintenance.maintenanceType,
            description: maintenance.description,
            cancellationReason: maintenance.cancellationReason,
            cancellationNotes: maintenance.cancellationNotes
          },
          icon: 'fas fa-times-circle',
          color: '#dc3545'
        });
      }
    }

    return events;
  }

  private buildAssetBasicInfo(asset: any): AssetBasicInfoDto {
    return {
      id: asset.id,
      assetId: asset.assetId,
      name: `${asset.assetType?.name} - ${asset.brand?.name} ${asset.model?.name}`,
      currentStatus: asset.status,
      currentCondition: asset.condition,
      location: asset.location,
      serialNumber: asset.serialNumber,
      assetType: asset.assetType?.name || '',
      brand: asset.brand?.name || '',
      model: asset.model?.name || ''
    };
  }

  private async calculateSummaryStats(assetId: number, events: AssetHistoryEventDto[]): Promise<AssetHistorySummaryDto> {
    const assignmentEvents = events.filter(e => e.type === AssetEventType.ASSIGNED);
    const maintenanceEvents = events.filter(e => 
      e.type === AssetEventType.MAINTENANCE_SCHEDULED ||
      e.type === AssetEventType.MAINTENANCE_COMPLETED ||
      e.type === AssetEventType.MAINTENANCE_CANCELLED
    );
    const statusChangeEvents = events.filter(e => 
      e.type === AssetEventType.STATUS_CHANGED ||
      e.type === AssetEventType.ASSIGNED ||
      e.type === AssetEventType.RETURNED
    );

    // Calculate total cost from maintenance events
    const totalCost = maintenanceEvents.reduce((sum, event) => {
      const cost = event.details.actualCost || event.details.estimatedCost || 0;
      return sum + cost;
    }, 0);

    // Get current asset info
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId }
    });

    return {
      totalEvents: events.length,
      lastActivity: events.length > 0 ? events[0].date : asset!.createdAt.toISOString(),
      currentStatus: asset!.status,
      currentCondition: asset!.condition,
      totalAssignments: assignmentEvents.length,
      totalMaintenance: maintenanceEvents.filter(e => e.type === AssetEventType.MAINTENANCE_SCHEDULED).length,
      totalStatusChanges: statusChangeEvents.length,
      totalCost: totalCost > 0 ? totalCost : undefined
    };
  }

  private async calculateQuickStats(assetId: number) {
    // Calculate average assignment duration
    const assignments = await this.prisma.assetIssue.findMany({
      where: { 
        assetId,
        returnDate: { not: null }
      },
      select: {
        issueDate: true,
        returnDate: true
      }
    });

    let avgDuration = 'N/A';
    if (assignments.length > 0) {
      const totalDays = assignments.reduce((sum, assignment) => {
        const days = Math.floor((assignment.returnDate!.getTime() - assignment.issueDate.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      avgDuration = `${Math.round(totalDays / assignments.length)} days`;
    }

    // Calculate maintenance frequency
    const maintenanceCount = await this.prisma.maintenanceSchedule.count({
      where: { 
        assetId,
        isActive: true,
        status: 'COMPLETED'
      }
    });

    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      select: { createdAt: true }
    });

    let maintenanceFrequency = 'N/A';
    if (maintenanceCount > 0 && asset) {
      const monthsSinceCreation = Math.floor((Date.now() - asset.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30));
      if (monthsSinceCreation > 0) {
        const frequency = Math.round(monthsSinceCreation / maintenanceCount);
        maintenanceFrequency = `Every ${frequency} months`;
      }
    }

    // Most common status (simplified - would need audit log for accurate tracking)
    const mostCommonStatus = 'ASSIGNED'; // Placeholder

    return {
      avgAssignmentDuration: avgDuration,
      maintenanceFrequency,
      mostCommonStatus
    };
  }

  /**
   * Get audit log events for an asset
   */
  private async getAuditEvents(assetId: number, query: AssetHistoryQueryDto): Promise<AssetHistoryEventDto[]> {
    const auditLogs = await this.prisma.assetAuditLog.findMany({
      where: { assetId },
      include: {
        changedByUser: {
          select: {
            username: true,
            employee: {
              select: {
                employeeId: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { changedAt: 'desc' },
    });

    return auditLogs.map(log => {
      let eventType: AssetEventType;
      let title: string;
      let description: string;

      switch (log.changeType) {
        case 'STATUS_CHANGE':
          eventType = AssetEventType.STATUS_CHANGED;
          title = 'Status Changed';
          description = `Asset status changed from ${log.oldValue} to ${log.newValue}`;
          break;
        case 'CONDITION_CHANGE':
          eventType = AssetEventType.CONDITION_CHANGED;
          title = 'Condition Changed';
          description = `Asset condition changed from ${log.oldValue} to ${log.newValue}`;
          break;
        case 'LOCATION_CHANGE':
          eventType = AssetEventType.LOCATION_CHANGED;
          title = 'Location Changed';
          description = `Asset location changed from ${log.oldValue || 'None'} to ${log.newValue || 'None'}`;
          break;
        case 'RETIREMENT':
          eventType = AssetEventType.RETIRED;
          title = 'Asset Retired';
          description = `Asset was retired. Reason: ${log.changeReason || 'Not specified'}`;
          break;
        case 'REACTIVATION':
          eventType = AssetEventType.REACTIVATED;
          title = 'Asset Reactivated';
          description = `Asset was reactivated. Reason: ${log.changeReason || 'Not specified'}`;
          break;
        default:
          eventType = AssetEventType.ASSET_UPDATED;
          title = 'Asset Updated';
          description = `${log.fieldName} changed from ${log.oldValue || 'None'} to ${log.newValue || 'None'}`;
      }

      return {
        id: `audit-${log.id}`,
        type: eventType,
        date: log.changedAt.toISOString(),
        title,
        description,
        userId: log.changedBy,
        userName: log.changedByUser.username,
        userDisplayName: `${log.changedByUser.employee.firstName} ${log.changedByUser.employee.lastName}`,
        details: {
          fieldName: log.fieldName,
          oldValue: log.oldValue,
          newValue: log.newValue,
          changeReason: log.changeReason,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
        },
        color: this.getEventColor(eventType),
        icon: this.getEventIcon(eventType),
      };
    });
  }

  /**
   * Get event color based on type
   */
  private getEventColor(eventType: AssetEventType): string {
    switch (eventType) {
      case AssetEventType.STATUS_CHANGED:
        return '#3b82f6'; // Blue
      case AssetEventType.CONDITION_CHANGED:
        return '#f59e0b'; // Amber
      case AssetEventType.LOCATION_CHANGED:
        return '#10b981'; // Emerald
      case AssetEventType.RETIRED:
        return '#ef4444'; // Red
      case AssetEventType.REACTIVATED:
        return '#8b5cf6'; // Violet
      case AssetEventType.ASSET_UPDATED:
        return '#6b7280'; // Gray
      default:
        return '#6b7280';
    }
  }

  /**
   * Get event icon based on type
   */
  private getEventIcon(eventType: AssetEventType): string {
    switch (eventType) {
      case AssetEventType.STATUS_CHANGED:
        return 'fas fa-exchange-alt';
      case AssetEventType.CONDITION_CHANGED:
        return 'fas fa-tools';
      case AssetEventType.LOCATION_CHANGED:
        return 'fas fa-map-marker-alt';
      case AssetEventType.RETIRED:
        return 'fas fa-ban';
      case AssetEventType.REACTIVATED:
        return 'fas fa-redo';
      case AssetEventType.ASSET_UPDATED:
        return 'fas fa-edit';
      default:
        return 'fas fa-info-circle';
    }
  }
}

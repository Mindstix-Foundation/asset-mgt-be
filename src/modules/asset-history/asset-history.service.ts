import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimezoneUtil } from '../../shared/utils/timezone.util';
import { 
  AssetHistoryQueryDto, 
  AssetEventType,
  AssetHistoryResponseDto,
  AssetHistorySummaryResponseDto,
  AssetHistoryEventDto,
  AssetBasicInfoDto,
  AssetHistorySummaryDto,
  QuickStatsDto
} from './dto';

@Injectable()
export class AssetHistoryService {
  constructor(
    private readonly prisma: PrismaService
  ) {}

  /**
   * Utility method to safely format decimal values
   */
  private formatDecimal(value: any): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value);
    if (value && typeof value.toString === 'function') {
      return parseFloat(value.toString());
    }
    return null;
  }

  /**
   * Utility method to build enhanced user information
   */
  private buildUserInfo(user: any): any {
    if (!user) return null;
    
    return {
      id: user.id,
      username: user.username,
      displayName: user.employee ? 
        `${user.employee.firstName} ${user.employee.lastName}` : 
        user.username,
      email: user.employee?.email || null,
      employeeId: user.employee?.employeeId || null
    };
  }

  /**
   * Get asset by ID or asset code
   */
  private async getAssetByIdOrCode(idOrCode: string) {
    const asset = await this.prisma.asset.findFirst({
      where: {
        OR: [
          { id: isNaN(Number(idOrCode)) ? undefined : Number(idOrCode) },
          { assetId: idOrCode }
        ]
      },
      include: {
        assetType: true,
        brand: true,
        model: true,
        createdByUser: {
          include: { employee: true }
        },
        updatedByUser: {
          include: { employee: true }
        }
      }
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID or code '${idOrCode}' not found`);
    }

    return asset;
  }

  /**
   * Build asset basic info
   */
  private buildAssetBasicInfo(asset: any): AssetBasicInfoDto {
      return {
      id: asset.id,
      assetId: asset.assetId,
      name: `${asset.assetType?.name || 'Unknown'} - ${asset.brand?.name || 'Unknown'} ${asset.model?.name || ''}`.trim(),
      currentStatus: asset.status,
      currentCondition: asset.condition,
      assetType: asset.assetType?.name,
      brand: asset.brand?.name,
      model: asset.model?.name,
      serialNumber: asset.serialNumber,
      location: asset.location
    };
  }

  /**
   * Build event details based on event type
   */
  private buildEventDetails(event: any, asset: any): any {
    const details: any = {};

    switch (event.eventType) {
      case AssetEventType.ASSET_CREATED:
        details.assetId = event.metadata?.assetId || asset.assetId;
        details.assetType = event.metadata?.assetType || asset.assetType?.name || null;
        details.brand = event.metadata?.brand || asset.brand?.name || null;
        details.model = event.metadata?.model || asset.model?.name || null;
        details.serialNumber = event.metadata?.serialNumber || asset.serialNumber || null;
        details.condition = event.metadata?.condition || asset.condition || null;
        details.status = event.metadata?.status || asset.status || null;
        details.location = event.metadata?.location || asset.location || null;
        details.purchaseCost = event.metadata?.purchaseCost || asset.purchaseCost || null;
        details.vendor = event.metadata?.vendor || asset.vendor?.name || null;
        details.purchaseDate = asset.purchaseDate || null;
        details.warrantyStartDate = asset.warrantyStartDate || null;
        details.warrantyEndDate = asset.warrantyEndDate || null;
        details.notes = asset.notes || null;
        break;

      case AssetEventType.ASSET_UPDATED:
        // Show all changed fields from metadata
        if (event.metadata?.changes && event.metadata.changes.length > 0) {
          details.changes = event.metadata.changes.map((change: any) => ({
            field: change.fieldName,
            change: `${this.formatDateValueForField(change.oldValue, change.fieldName) || 'null'} → ${this.formatDateValueForField(change.newValue, change.fieldName) || 'null'}`
          }));
          details.totalChanges = event.metadata.totalChanges;
          details.updatedVia = event.metadata.updatedVia;
        } else if (event.oldValue && event.newValue) {
          // Fallback for old format
          details.change = `${this.formatDateValueForField(event.oldValue, event.fieldName)} → ${this.formatDateValueForField(event.newValue, event.fieldName)}`;
          details.fieldName = event.fieldName;
        }
        break;

      case AssetEventType.ASSET_RETIRED:
        // Show retirement details from metadata
        if (event.metadata) {
          details.retirementDate = event.metadata.retirementDate;
          details.retirementReason = event.metadata.retirementReason;
          details.retirementNotes = event.metadata.retirementNotes;
        }
        break;

      case AssetEventType.ASSET_REACTIVATED:
        // Show reactivation details from metadata
        if (event.metadata) {
          details.reactivationDate = event.metadata.reactivationDate;
          details.reactivationReason = event.metadata.reactivationReason;
          details.previousLocation = event.metadata.previousLocation;
          details.newLocation = event.metadata.newLocation;
        }
        break;

      case AssetEventType.ASSET_ISSUED:
        details.employee = event.metadata?.employeeName || 'Unknown Employee';
        details.employeeId = event.metadata?.employeeId || null;
        details.employeeEmail = event.metadata?.employeeEmail || null;
        details.issuedBy = event.metadata?.issuedBy || null;
        details.issueDate = event.metadata?.issueDate || null;
        details.issueCondition = event.metadata?.issueCondition || null;
        details.issueReason = event.metadata?.issueReason || null;
        details.notes = event.metadata?.notes || null;
        break;

      case AssetEventType.ASSET_COLLECTED:
        details.employee = event.metadata?.employeeName || 'Unknown Employee';
        details.employeeId = event.metadata?.employeeId || null;
        details.employeeEmail = event.metadata?.employeeEmail || null;
        details.collectedBy = event.metadata?.collectedBy || null;
        details.returnDate = event.metadata?.returnDate || null;
        details.returnReason = event.metadata?.returnReason || null;
        details.notes = event.metadata?.notes || null;
        break;

      case AssetEventType.MAINTENANCE_SCHEDULED:
        details.maintenanceType = event.metadata?.maintenanceType || 'Unknown';
        details.scheduledDate = this.formatDateValue(event.metadata?.scheduledDate) || null;
        details.estimatedCost = event.metadata?.estimatedCost || null;
        details.description = event.metadata?.description || event.notes;
        break;

      case AssetEventType.MAINTENANCE_UPDATED:
        details.maintenanceType = event.metadata?.maintenanceType || 'Unknown';
        details.scheduledDate = this.formatDateValue(event.metadata?.scheduledDate) || null;
        details.estimatedCost = event.metadata?.estimatedCost || null;
        details.description = event.metadata?.description || null;
        details.status = event.metadata?.status || null;
        // Show changes if available - filter out unnecessary fields
        if (event.metadata?.changes && event.metadata.changes.length > 0) {
          const meaningfulFields = [
            'maintenanceType',
            'scheduledDate', 
            'estimatedCost',
            'description',
            'frequencyDays'
          ];
          
          details.changes = event.metadata.changes
            .filter((change: any) => meaningfulFields.includes(change.fieldName))
            .filter((change: any) => {
              // Only show fields that actually changed (not null → null or same value)
              const oldValue = change.oldValue || 'null';
              const newValue = change.newValue || 'null';
              return oldValue !== newValue;
            })
            .map((change: any) => ({
              field: change.fieldName,
              change: `${this.formatDateValueForField(change.oldValue, change.fieldName) || 'null'} → ${this.formatDateValueForField(change.newValue, change.fieldName) || 'null'}`
            }));
          details.totalChanges = details.changes.length;
        }
        break;

      case AssetEventType.MAINTENANCE_COMPLETED:
        details.maintenanceType = event.metadata?.maintenanceType || 'Unknown';
        details.scheduledDate = this.formatDateValue(event.metadata?.scheduledDate) || null;
        details.actualCompletionDate = this.formatDateValue(event.metadata?.actualCompletionDate) || null;
        details.estimatedCost = event.metadata?.estimatedCost || null;
        details.actualCost = event.metadata?.actualCost || null;
        details.description = event.metadata?.description || null;
        details.completionNotes = event.metadata?.completionNotes || null;
        break;

      case AssetEventType.MAINTENANCE_CANCELLED:
        details.maintenanceType = event.metadata?.maintenanceType || 'Unknown';
        details.scheduledDate = this.formatDateValue(event.metadata?.scheduledDate) || null;
        details.cancellationDate = this.formatDateValue(event.metadata?.cancellationDate) || null;
        details.estimatedCost = event.metadata?.estimatedCost || null;
        details.description = event.metadata?.description || null;
        details.cancellationNotes = event.metadata?.cancellationNotes || null;
        break;

      default:
        if (event.oldValue && event.newValue) {
          details.change = `${event.oldValue} → ${event.newValue}`;
        }
        break;
    }

    return details;
  }

  /**
   * Get event icon and color
   */
  private getEventIconAndColor(eventType: AssetEventType): { icon: string; color: string } {
    const eventStyles: Record<AssetEventType, { icon: string; color: string }> = {
      [AssetEventType.ASSET_CREATED]: { icon: 'fas fa-plus-circle', color: '#28a745' },
      [AssetEventType.ASSET_UPDATED]: { icon: 'fas fa-edit', color: '#007bff' },
      [AssetEventType.ASSET_RETIRED]: { icon: 'fas fa-ban', color: '#6c757d' },
      [AssetEventType.ASSET_REACTIVATED]: { icon: 'fas fa-redo', color: '#17a2b8' },
      [AssetEventType.ASSET_ISSUED]: { icon: 'fas fa-user-plus', color: '#007bff' },
      [AssetEventType.ASSET_COLLECTED]: { icon: 'fas fa-user-minus', color: '#6c757d' },
      [AssetEventType.MAINTENANCE_SCHEDULED]: { icon: 'fas fa-calendar-plus', color: '#6f42c1' },
      [AssetEventType.MAINTENANCE_UPDATED]: { icon: 'fas fa-edit', color: '#007bff' },
      [AssetEventType.MAINTENANCE_COMPLETED]: { icon: 'fas fa-check-circle', color: '#28a745' },
      [AssetEventType.MAINTENANCE_CANCELLED]: { icon: 'fas fa-times-circle', color: '#dc3545' }
    };

    return eventStyles[eventType] || { icon: 'fas fa-info-circle', color: '#6c757d' };
  }

  /**
   * Get event title
   */
  private getEventTitle(eventType: AssetEventType): string {
    const titles: Record<AssetEventType, string> = {
      [AssetEventType.ASSET_CREATED]: 'Asset Created',
      [AssetEventType.ASSET_UPDATED]: 'asset updated',
      [AssetEventType.ASSET_RETIRED]: 'Asset Retired',
      [AssetEventType.ASSET_REACTIVATED]: 'Asset Reactivated',
      [AssetEventType.ASSET_ISSUED]: 'Asset Issued',
      [AssetEventType.ASSET_COLLECTED]: 'Asset Collected',
      [AssetEventType.MAINTENANCE_SCHEDULED]: 'Maintenance Scheduled',
      [AssetEventType.MAINTENANCE_UPDATED]: 'Maintenance Updated',
      [AssetEventType.MAINTENANCE_COMPLETED]: 'Maintenance Completed',
      [AssetEventType.MAINTENANCE_CANCELLED]: 'Maintenance Cancelled'
    };

    return titles[eventType] || 'Unknown Event';
  }

  /**
   * Get event description
   */
  private getEventDescription(event: any, eventType: AssetEventType): string {
    switch (eventType) {
      case AssetEventType.ASSET_CREATED:
        return `Asset created with ID ${event.metadata?.assetId || 'Unknown'}`;
      
      case AssetEventType.ASSET_UPDATED:
        return `Asset details updated`;
      
      case AssetEventType.ASSET_RETIRED:
        return `Asset retired`;
      
      case AssetEventType.ASSET_REACTIVATED:
        return `Asset reactivated`;
      
      case AssetEventType.ASSET_ISSUED:
        return `Issued to ${event.metadata?.employeeName || 'Unknown Employee'} (${event.metadata?.employeeId || 'N/A'})`;
      
      case AssetEventType.ASSET_COLLECTED:
        return `Collected from ${event.metadata?.employeeName || 'Unknown Employee'} (${event.metadata?.employeeId || 'N/A'})`;
      
      case AssetEventType.MAINTENANCE_SCHEDULED:
        return `Maintenance scheduled for ${event.metadata?.maintenanceType || 'Unknown'} type`;
      
      case AssetEventType.MAINTENANCE_UPDATED:
        return `Maintenance schedule updated`;
      
      case AssetEventType.MAINTENANCE_COMPLETED:
        return `Maintenance completed for ${event.metadata?.maintenanceType || 'Unknown'} type`;
      
      case AssetEventType.MAINTENANCE_CANCELLED:
        return `Maintenance cancelled for ${event.metadata?.maintenanceType || 'Unknown'} type`;
      
      default:
        return 'No additional details';
    }
  }

  /**
   * Get asset status and condition at the time of event
   * Since we don't have AssetStatusHistory and AssetConditionHistory tables,
   * we'll derive the status/condition from the event metadata or use current values
   */
  private async getAssetStateAtEvent(assetId: number, eventDate: Date, event?: any): Promise<{ status: string; condition: string }> {
    // If we have event metadata with status/condition info, use that
    if (event?.metadata) {
      const status = event.metadata.newStatus || event.metadata.status || event.metadata.previousStatus;
      const condition = event.metadata.newCondition || event.metadata.condition || event.metadata.previousCondition;
      
      if (status && condition) {
        return { status, condition };
      }
    }

    // Fallback: Get current asset status and condition
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      select: { status: true, condition: true }
    });

    return {
      status: asset?.status || 'UNKNOWN',
      condition: asset?.condition || 'UNKNOWN'
    };
  }

  /**
   * Build asset issue/return event from AssetIssue table
   */
  private async buildAssetIssueEvent(issue: any, asset: any, eventType: AssetEventType.ASSET_ISSUED | AssetEventType.ASSET_COLLECTED): Promise<AssetHistoryEventDto> {
    const { icon, color } = this.getEventIconAndColor(eventType);
    
    let userInfo;
    let eventDate;
    let description;
    let details;

    if (eventType === AssetEventType.ASSET_ISSUED) {
      userInfo = this.buildUserInfo(issue.issuedByUser);
      eventDate = issue.issueTimestamp; // Use audit timestamp for chronological ordering
      description = `issue to ${issue.employee.firstName} ${issue.employee.lastName} (${issue.employee.employeeId})`;
      details = {
        employee: `${issue.employee.firstName} ${issue.employee.lastName}`,
        employeeId: issue.employee.employeeId,
        businessDate: issue.issueDate, // Include business date in details
        reason: issue.issueReason,
        notes: issue.notes
      };
    } else {
      userInfo = this.buildUserInfo(issue.updatedByUser);
      eventDate = issue.returnTimestamp; // Use audit timestamp for chronological ordering
      description = `collected from ${issue.employee.firstName} ${issue.employee.lastName} (${issue.employee.employeeId})`;
      details = {
        employee: `${issue.employee.firstName} ${issue.employee.lastName}`,
        employeeId: issue.employee.employeeId,
        businessDate: issue.returnDate, // Include business date in details
        returnReason: issue.returnReason,
        notes: issue.notes
      };
    }

    // Get asset state at the time of this event
    const assetState = await this.getAssetStateAtEvent(asset.id, eventDate, issue);

    return {
      id: `issue-${issue.id}-${eventType.toLowerCase()}`,
      type: eventType,
      dateIST: TimezoneUtil.toISTString(eventDate),
      description,
      userDisplayName: userInfo?.displayName || 'Unknown User',
      details,
      icon,
      color,
      status: assetState.status,
      condition: assetState.condition
    };
  }

  /**
   * Build consolidated asset history event
   */
  private async buildAssetHistoryEvent(event: any, asset: any): Promise<AssetHistoryEventDto> {
    const { icon, color } = this.getEventIconAndColor(event.eventType);
    const userInfo = this.buildUserInfo(event.performedByUser);
    
    // Get asset state at the time of this event
    const assetState = await this.getAssetStateAtEvent(asset.id, event.eventDate, event);

    // Determine status display - show change if it's an asset update event with status change, otherwise show current status
    let statusDisplay: string;
    if (event.eventType === AssetEventType.ASSET_UPDATED) {
      // Check for status change in metadata changes array
      const statusChange = event.metadata?.changes?.find((change: any) => change.fieldName === 'status');
      if (statusChange) {
        statusDisplay = `${statusChange.oldValue} → ${statusChange.newValue}`;
      } else {
        statusDisplay = assetState.status;
      }
    } else if (event.eventType === AssetEventType.ASSET_RETIRED) {
      // Show status transition for retirement
      if (event.metadata?.previousStatus && event.metadata?.newStatus) {
        statusDisplay = `${event.metadata.previousStatus} → ${event.metadata.newStatus}`;
      } else {
        statusDisplay = assetState.status;
      }
    } else if (event.eventType === AssetEventType.ASSET_REACTIVATED) {
      // Show status transition for reactivation
      if (event.metadata?.previousStatus && event.metadata?.newStatus) {
        statusDisplay = `${event.metadata.previousStatus} → ${event.metadata.newStatus}`;
      } else {
        statusDisplay = assetState.status;
      }
    } else if (event.eventType === AssetEventType.ASSET_ISSUED) {
      // Show status transition for asset issue
      if (event.metadata?.previousStatus && event.metadata?.newStatus) {
        statusDisplay = `${event.metadata.previousStatus} → ${event.metadata.newStatus}`;
      } else {
        statusDisplay = assetState.status;
      }
    } else if (event.eventType === AssetEventType.ASSET_COLLECTED) {
      // Show status transition for asset collection
      if (event.metadata?.previousStatus && event.metadata?.newStatus) {
        statusDisplay = `${event.metadata.previousStatus} → ${event.metadata.newStatus}`;
      } else {
        statusDisplay = assetState.status;
      }
    } else if (event.eventType === AssetEventType.MAINTENANCE_SCHEDULED) {
      // Show status transition for maintenance scheduling
      if (event.metadata?.previousStatus && event.metadata?.newStatus) {
        statusDisplay = `${event.metadata.previousStatus} → ${event.metadata.newStatus}`;
      } else {
        statusDisplay = assetState.status;
      }
    } else if (event.eventType === AssetEventType.MAINTENANCE_UPDATED) {
      // For maintenance updates, check the maintenance status in metadata
      const maintenanceStatus = event.metadata?.status;
      if (maintenanceStatus === 'SCHEDULED' || maintenanceStatus === 'IN_PROGRESS') {
        statusDisplay = 'IN_MAINTENANCE';
      } else {
        statusDisplay = assetState.status; // AVAILABLE for COMPLETED/CANCELLED
      }
    } else if (event.eventType === AssetEventType.MAINTENANCE_COMPLETED) {
      // For maintenance completion, show status transition
      if (event.metadata?.previousStatus && event.metadata?.newStatus) {
        statusDisplay = `${event.metadata.previousStatus} → ${event.metadata.newStatus}`;
      } else {
        statusDisplay = 'IN_MAINTENANCE → AVAILABLE';
      }
    } else if (event.eventType === AssetEventType.MAINTENANCE_CANCELLED) {
      // For maintenance cancellation, show status transition
      if (event.metadata?.previousStatus && event.metadata?.newStatus) {
        statusDisplay = `${event.metadata.previousStatus} → ${event.metadata.newStatus}`;
      } else {
        statusDisplay = 'IN_MAINTENANCE → AVAILABLE';
      }
    } else {
      statusDisplay = assetState.status;
    }

    // Determine condition display - show change if it's an asset update event with condition change, otherwise show current condition
    let conditionDisplay: string;
    if (event.eventType === AssetEventType.ASSET_UPDATED) {
      // Check for condition change in metadata changes array
      const conditionChange = event.metadata?.changes?.find((change: any) => change.fieldName === 'condition');
      if (conditionChange) {
        conditionDisplay = `${conditionChange.oldValue} → ${conditionChange.newValue}`;
      } else {
        conditionDisplay = assetState.condition;
      }
    } else if (event.eventType === AssetEventType.ASSET_REACTIVATED) {
      // Show condition transition for reactivation
      if (event.metadata?.previousCondition && event.metadata?.newCondition) {
        conditionDisplay = `${event.metadata.previousCondition} → ${event.metadata.newCondition}`;
      } else {
        conditionDisplay = assetState.condition;
      }
    } else if (event.eventType === AssetEventType.ASSET_COLLECTED) {
      // Show condition transition for asset collection
      if (event.metadata?.previousCondition && event.metadata?.newCondition) {
        conditionDisplay = `${event.metadata.previousCondition} → ${event.metadata.newCondition}`;
      } else {
        conditionDisplay = assetState.condition;
      }
    } else {
      conditionDisplay = assetState.condition;
    }

    return {
      id: `event-${event.id}`,
      type: event.eventType,
      dateIST: TimezoneUtil.toISTString(event.eventDate),
      description: this.getEventDescription(event, event.eventType),
      userDisplayName: userInfo?.displayName || 'Unknown User',
      details: this.buildEventDetails(event, asset),
      icon,
      color,
      // Always show status and condition - with changes if applicable
      status: statusDisplay,
      condition: conditionDisplay
    };
  }

  /**
   * Get asset history with pagination and filtering
   */
  async getAssetHistory(idOrCode: string, query: AssetHistoryQueryDto): Promise<AssetHistoryResponseDto> {
    const asset = await this.getAssetByIdOrCode(idOrCode);
    
    // Build where clause
    const where: any = {
      assetId: asset.id
    };

    // Filter by event types
    if (query.eventTypes) {
      const eventTypes = query.eventTypes.split(',').map(type => type.trim());
      where.eventType = { in: eventTypes };
    }

    // Filter by date range
    if (query.dateFrom || query.dateTo) {
      where.eventDate = {};
      if (query.dateFrom) {
        where.eventDate.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.eventDate.lte = new Date(query.dateTo + 'T23:59:59.999Z');
      }
    }

    // Filter by user
    if (query.userId) {
      where.performedBy = query.userId;
    }

    // Search in notes and reason
    if (query.search) {
      where.OR = [
        { notes: { contains: query.search, mode: 'insensitive' } },
        { reason: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    // Calculate pagination
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Get AssetEvents and AssetIssues in parallel
    // Get asset events only (AssetIssue records are now logged as AssetEvent records)
    const [events, totalEvents] = await Promise.all([
      this.prisma.assetEvent.findMany({
        where,
        include: {
          performedByUser: {
            include: { employee: true }
          }
        },
        orderBy: {
          eventDate: query.sortOrder === 'asc' ? 'asc' : 'desc'
        }
      }),
      this.prisma.assetEvent.count({ where })
    ]);

    // Combine and sort all events (only AssetEvent records now)
    const allEvents = [
      ...events.map(event => ({ type: 'event', data: event, date: event.eventDate }))
    ];

    // Sort by date
    allEvents.sort((a, b) => {
      const dateA = new Date(a.date || new Date());
      const dateB = new Date(b.date || new Date());
      return query.sortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
    });

    // Apply pagination to combined results
    const paginatedEvents = allEvents.slice(skip, skip + limit);

    // Build timeline (only AssetEvent records now)
    const timeline = (await Promise.all(paginatedEvents.map(item => {
      if (item.type === 'event') {
        return this.buildAssetHistoryEvent(item.data, asset);
      }
      return null;
    }))).filter((event): event is AssetHistoryEventDto => event !== null);

    // Build pagination info
    const totalCount = totalEvents;
    const totalPages = Math.ceil(totalCount / limit);
    const pagination = {
      currentPage: page,
      totalPages,
      totalEvents: totalCount,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
      limit
    };

    return {
      timestamp: new Date().toISOString(),
      description: 'Asset history retrieved successfully',
      asset: this.buildAssetBasicInfo(asset),
      timeline,
      pagination
    };
  }

  /**
   * Get asset history summary
   */
  async getAssetHistorySummary(idOrCode: string, query: AssetHistoryQueryDto = {}): Promise<AssetHistorySummaryResponseDto> {
    const asset = await this.getAssetByIdOrCode(idOrCode);

    // Build where clause for filtering
    const where: any = {
      assetId: asset.id
    };

    // Filter by event types
    if (query.eventTypes) {
      const eventTypes = query.eventTypes.split(',').map(type => type.trim());
      where.eventType = { in: eventTypes };
    }

    // Filter by date range
    if (query.dateFrom || query.dateTo) {
      where.eventDate = {};
      if (query.dateFrom) {
        where.eventDate.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.eventDate.lte = new Date(query.dateTo + 'T23:59:59.999Z');
      }
    }

    // Search in notes and reason
    if (query.search) {
      where.OR = [
        { notes: { contains: query.search, mode: 'insensitive' } },
        { reason: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    // Get all events for summary (only AssetEvent records now)
    const events = await this.prisma.assetEvent.findMany({
      where,
      include: {
        performedByUser: {
          include: { employee: true }
        }
      },
      orderBy: { eventDate: 'desc' }
    });

    // Combine and sort all events (only AssetEvent records now)
    const allEvents = [
      ...events.map(event => ({ type: 'event', data: event, date: event.eventDate }))
    ];

    // Sort by date (most recent first)
    allEvents.sort((a, b) => new Date(b.date || new Date()).getTime() - new Date(a.date || new Date()).getTime());

    // Calculate summary statistics
    const totalEvents = allEvents.length;
    const lastActivity = allEvents.length > 0 ? (allEvents[0].date || asset.updatedAt) : asset.updatedAt;

    // Count events by type
    const eventCounts = allEvents.reduce((acc, item) => {
      if (item.type === 'event' && 'eventType' in item.data) {
        acc[item.data.eventType] = (acc[item.data.eventType] || 0) + 1;
      } else if (item.type === 'issue') {
        acc[AssetEventType.ASSET_ISSUED] = (acc[AssetEventType.ASSET_ISSUED] || 0) + 1;
      } else if (item.type === 'return') {
        acc[AssetEventType.ASSET_COLLECTED] = (acc[AssetEventType.ASSET_COLLECTED] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const totalAssignments = eventCounts[AssetEventType.ASSET_ISSUED] || 0;
    const totalMaintenance = (eventCounts[AssetEventType.MAINTENANCE_SCHEDULED] || 0) +
                           (eventCounts[AssetEventType.MAINTENANCE_UPDATED] || 0) +
                           (eventCounts[AssetEventType.MAINTENANCE_COMPLETED] || 0) +
                           (eventCounts[AssetEventType.MAINTENANCE_CANCELLED] || 0);
    const totalStatusChanges = events.filter(event => 
      event.eventType === AssetEventType.ASSET_UPDATED && event.fieldName === 'status'
    ).length;

    // Calculate total cost (from asset updates with cost changes)
    const totalCost = events
      .filter(event => event.eventType === AssetEventType.ASSET_UPDATED && event.fieldName === 'purchaseCost')
      .reduce((sum, event) => {
        const cost = this.formatDecimal((event as any).newValue);
        return sum + (cost || 0);
      }, 0);

    // Get recent events (last 5) - only AssetEvent records now
    const recentEvents = (await Promise.all(allEvents.slice(0, 5).map(item => {
      if (item.type === 'event') {
        return this.buildAssetHistoryEvent(item.data, asset);
      }
      return null;
    }))).filter((event): event is AssetHistoryEventDto => event !== null);

    // Build summary
    const summary: AssetHistorySummaryDto = {
      totalEvents,
      lastActivity: lastActivity.toISOString(),
      currentStatus: asset.status,
      currentCondition: asset.condition,
      totalAssignments,
      totalMaintenance,
      totalStatusChanges,
      totalCost,
      eventCounts
    };

    // Build quick stats
    const quickStats: QuickStatsDto = {
      mostCommonStatus: asset.status,
      mostCommonCondition: asset.condition,
      maintenanceFrequency: totalMaintenance > 0 ? 'Regular' : 'None',
      avgAssignmentDuration: totalAssignments > 0 ? 'Active' : 'N/A'
    };

    return {
      timestamp: new Date().toISOString(),
      description: 'Asset history summary retrieved successfully',
      asset: this.buildAssetBasicInfo(asset),
      summary,
      recentEvents,
      quickStats
    };
  }

  /**
   * Format date values for display (for direct field display like scheduledDate)
   * Converts Date objects and date strings to yyyy-mm-dd format
   */
  private formatDateValue(value: any): string | null {
    if (value === null || value === undefined) return null;
    
    // Handle Date objects
    if (value instanceof Date) {
      return value.toISOString().split('T')[0]; // yyyy-mm-dd format
    }
    
    // Handle date strings
    if (typeof value === 'string') {
      // Check if it's already in yyyy-mm-dd format
      if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return value; // Already in correct format
      }
      
      // Try to parse as a date (handles ISO format, full timestamp strings, etc.)
      try {
        const date = new Date(value);
        // Check if it's a valid date and not a regular string
        if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
          return date.toISOString().split('T')[0]; // yyyy-mm-dd format
        }
      } catch (e) {
        // If parsing fails, return as-is
      }
    }
    
    // Return as-is for all other values (numbers, non-date strings, etc.)
    return value.toString();
  }

  /**
   * Format date values for display in changes array (field-specific formatting)
   * Only formats values for known date fields
   */
  private formatDateValueForField(value: any, fieldName: string): string | null {
    if (value === null || value === undefined) return null;
    
    // List of known date fields
    const dateFields = [
      'purchaseDate',
      'warrantyStartDate',
      'warrantyEndDate',
      'retirementDate',
      'reactivationDate',
      'scheduledDate',
      'actualStartDate',
      'actualCompletionDate',
      'cancellationDate',
      'issueDate',
      'returnDate'
    ];
    
    // Only format if it's a known date field
    if (dateFields.includes(fieldName)) {
      // Handle Date objects
      if (value instanceof Date) {
        return value.toISOString().split('T')[0]; // yyyy-mm-dd format
      }
      
      // Handle date strings
      if (typeof value === 'string') {
        // Check if it's already in yyyy-mm-dd format
        if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return value; // Already in correct format
        }
        
        // Try to parse as a date (handles ISO format, full timestamp strings, etc.)
        try {
          const date = new Date(value);
          // Check if it's a valid date
          if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
            return date.toISOString().split('T')[0]; // yyyy-mm-dd format
          }
        } catch (e) {
          // If parsing fails, return as-is
        }
      }
    }
    
    // For non-date fields, return as-is
    return value?.toString() || null;
  }
}

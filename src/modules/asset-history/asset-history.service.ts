import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { TimezoneUtil } from '../../shared/utils/timezone.util';
import {
  AssetHistoryQueryDto,
  AssetEventType,
  AssetHistoryResponseDto,
  AssetHistorySummaryResponseDto,
  AssetHistoryEventDto,
  AssetBasicInfoDto,
  AssetHistorySummaryDto,
  QuickStatsDto,
} from './dto';

@Injectable()
export class AssetHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Utility method to safely format decimal values
   */
  private formatDecimal(value: any): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number.parseFloat(value);
    if (value && typeof value.toString === 'function') {
      return Number.parseFloat(value.toString());
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
      displayName: user.employee
        ? `${user.employee.firstName} ${user.employee.lastName}`
        : user.username,
      email: user.employee?.email || null,
      employeeId: user.employee?.employeeId || null,
    };
  }

  /**
   * Get asset by ID or asset code
   */
  private async getAssetByIdOrCode(idOrCode: string) {
    const asset = await this.prisma.asset.findFirst({
      where: {
        OR: [
          { id: Number.isNaN(Number(idOrCode)) ? undefined : Number(idOrCode) },
          { assetId: idOrCode },
        ],
      },
      include: {
        assetType: true,
        brand: true,
        model: true,
        createdByUser: {
          include: { employee: true },
        },
        updatedByUser: {
          include: { employee: true },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException(
        `Asset with ID or code '${idOrCode}' not found`,
      );
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
      location: asset.location,
    };
  }

  /**
   * Build asset creation event details
   */
  private buildAssetCreatedDetails(event: any, asset: any): any {
    const details: any = {
      assetId: event.metadata?.assetId || asset.assetId,
      assetType: event.metadata?.assetType || asset.assetType?.name || null,
      brand: event.metadata?.brand || asset.brand?.name || null,
      model: event.metadata?.model || asset.model?.name || null,
      serialNumber: event.metadata?.serialNumber || asset.serialNumber || null,
      condition: event.metadata?.condition || asset.condition || null,
      status: event.metadata?.status || asset.status || null,
      location: event.metadata?.location || asset.location || null,
      purchaseCost: event.metadata?.purchaseCost || asset.purchaseCost || null,
      vendor: event.metadata?.vendor || asset.vendor?.name || null,
      purchaseDate: asset.purchaseDate || null,
      warrantyStartDate: asset.warrantyStartDate || null,
      warrantyEndDate: asset.warrantyEndDate || null,
      notes: asset.notes || null,
    };

    // Include specifications if available with label mapping
    if (event.metadata?.specifications) {
      const specs = event.metadata.specifications;
      if (specs && typeof specs === 'object') {
        // Build label map from asset type's specification template
        const labelMap = this.buildSpecificationLabelMap(
          asset.assetType?.specificationTemplate,
        );

        // Flatten specifications with labels into the details object
        for (const [key, value] of Object.entries(specs)) {
          if (value !== null && value !== undefined && value !== '') {
            // Use label if available, otherwise use key
            const label = labelMap[key] || key;
            details[label] = value;
          }
        }
      }
    }

    return details;
  }

  /**
   * Build specification label map from template
   */
  private buildSpecificationLabelMap(
    specificationTemplate?: any,
  ): Record<string, string> {
    if (!specificationTemplate) {
      return {};
    }

    // If template is a string (JSON), parse it
    let template = specificationTemplate;
    if (typeof specificationTemplate === 'string') {
      try {
        template = JSON.parse(specificationTemplate);
      } catch (error) {
        // Invalid JSON template, return empty map
        console.error('Failed to parse specification template:', error);
        return {};
      }
    }

    // Check if fields array exists
    if (
      !template?.fields ||
      !Array.isArray(template.fields) ||
      template.fields.length === 0
    ) {
      return {};
    }

    const labelMap: Record<string, string> = {};
    for (const field of template.fields) {
      if (field?.key && field?.label) {
        labelMap[field.key] = field.label;
      }
    }
    return labelMap;
  }

  /**
   * Build asset updated event details
   */
  private buildAssetUpdatedDetails(event: any): any {
    const details: any = {};

    if (event.metadata?.changes && event.metadata.changes.length > 0) {
      details.changes = event.metadata.changes.map((change: any) => ({
        field: change.fieldName,
        change: `${this.formatDateValueForField(change.oldValue, change.fieldName) || 'null'} → ${this.formatDateValueForField(change.newValue, change.fieldName) || 'null'}`,
      }));
      details.totalChanges = event.metadata.totalChanges;
      details.updatedVia = event.metadata.updatedVia;
    } else if (event.oldValue && event.newValue) {
      // Fallback for old format
      details.change = `${this.formatDateValueForField(event.oldValue, event.fieldName)} → ${this.formatDateValueForField(event.newValue, event.fieldName)}`;
      details.fieldName = event.fieldName;
    }

    return details;
  }

  /**
   * Build maintenance updated event details
   */
  private buildMaintenanceUpdatedDetails(event: any): any {
    const details: any = {
      maintenanceType: event.metadata?.maintenanceType || 'Unknown',
      scheduledDate:
        this.formatDateValue(event.metadata?.scheduledDate) || null,
      estimatedCost: event.metadata?.estimatedCost || null,
      description: event.metadata?.description || null,
      status: event.metadata?.status || null,
    };

    // Show changes if available - filter out unnecessary fields
    if (event.metadata?.changes && event.metadata.changes.length > 0) {
      const meaningfulFields = new Set([
        'maintenanceType',
        'scheduledDate',
        'estimatedCost',
        'description',
        'frequencyDays',
      ]);

      details.changes = event.metadata.changes
        .filter((change: any) => meaningfulFields.has(change.fieldName))
        .filter((change: any) => {
          // Only show fields that actually changed (not null → null or same value)
          const oldValue = change.oldValue || 'null';
          const newValue = change.newValue || 'null';
          return oldValue !== newValue;
        })
        .map((change: any) => ({
          field: change.fieldName,
          change: `${this.formatDateValueForField(change.oldValue, change.fieldName) || 'null'} → ${this.formatDateValueForField(change.newValue, change.fieldName) || 'null'}`,
        }));
      details.totalChanges = details.changes.length;
    }

    return details;
  }

  /**
   * Build event details based on event type
   */
  private buildEventDetails(event: any, asset: any): any {
    const details: any = {};

    switch (event.eventType) {
      case AssetEventType.ASSET_CREATED:
        return this.buildAssetCreatedDetails(event, asset);

      case AssetEventType.ASSET_UPDATED:
        return this.buildAssetUpdatedDetails(event);

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
        details.scheduledDate =
          this.formatDateValue(event.metadata?.scheduledDate) || null;
        details.estimatedCost = event.metadata?.estimatedCost || null;
        details.description = event.metadata?.description || event.notes;
        break;

      case AssetEventType.MAINTENANCE_UPDATED:
        return this.buildMaintenanceUpdatedDetails(event);

      case AssetEventType.MAINTENANCE_COMPLETED:
        details.maintenanceType = event.metadata?.maintenanceType || 'Unknown';
        details.scheduledDate =
          this.formatDateValue(event.metadata?.scheduledDate) || null;
        details.actualCompletionDate =
          this.formatDateValue(event.metadata?.actualCompletionDate) || null;
        details.estimatedCost = event.metadata?.estimatedCost || null;
        details.actualCost = event.metadata?.actualCost || null;
        details.description = event.metadata?.description || null;
        details.completionNotes = event.metadata?.completionNotes || null;
        break;

      case AssetEventType.MAINTENANCE_CANCELLED:
        details.maintenanceType = event.metadata?.maintenanceType || 'Unknown';
        details.scheduledDate =
          this.formatDateValue(event.metadata?.scheduledDate) || null;
        details.cancellationDate =
          this.formatDateValue(event.metadata?.cancellationDate) || null;
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
  private getEventIconAndColor(eventType: AssetEventType): {
    icon: string;
    color: string;
  } {
    const eventStyles: Record<AssetEventType, { icon: string; color: string }> =
      {
        [AssetEventType.ASSET_CREATED]: {
          icon: 'fas fa-plus-circle',
          color: '#28a745',
        },
        [AssetEventType.ASSET_UPDATED]: {
          icon: 'fas fa-edit',
          color: '#007bff',
        },
        [AssetEventType.ASSET_RETIRED]: {
          icon: 'fas fa-ban',
          color: '#6c757d',
        },
        [AssetEventType.ASSET_REACTIVATED]: {
          icon: 'fas fa-redo',
          color: '#17a2b8',
        },
        [AssetEventType.ASSET_ISSUED]: {
          icon: 'fas fa-user-plus',
          color: '#007bff',
        },
        [AssetEventType.ASSET_COLLECTED]: {
          icon: 'fas fa-user-minus',
          color: '#6c757d',
        },
        [AssetEventType.MAINTENANCE_SCHEDULED]: {
          icon: 'fas fa-calendar-plus',
          color: '#6f42c1',
        },
        [AssetEventType.MAINTENANCE_UPDATED]: {
          icon: 'fas fa-edit',
          color: '#007bff',
        },
        [AssetEventType.MAINTENANCE_COMPLETED]: {
          icon: 'fas fa-check-circle',
          color: '#28a745',
        },
        [AssetEventType.MAINTENANCE_CANCELLED]: {
          icon: 'fas fa-times-circle',
          color: '#dc3545',
        },
      };

    return (
      eventStyles[eventType] || { icon: 'fas fa-info-circle', color: '#6c757d' }
    );
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
      [AssetEventType.MAINTENANCE_CANCELLED]: 'Maintenance Cancelled',
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
   * Get initial asset state from creation event
   */
  private async getInitialAssetState(
    assetId: number,
  ): Promise<{ status: string; condition: string }> {
    // Start with default initial state
    let currentStatus = 'AVAILABLE'; // default initial status
    let currentCondition = 'NEW'; // default initial condition

    // Get the first ASSET_CREATED event to get initial values
    const creationEvent = await this.prisma.assetEvent.findFirst({
      where: {
        assetId: assetId,
        eventType: 'ASSET_CREATED',
      },
      orderBy: { eventDate: 'asc' },
      select: { metadata: true },
    });

    if (creationEvent?.metadata) {
      // Extract initial values from creation event metadata
      const metadata = creationEvent.metadata as any;
      if (metadata.status) {
        currentStatus = metadata.status;
      }
      if (metadata.condition) {
        currentCondition = metadata.condition;
      }
    }

    return { status: currentStatus, condition: currentCondition };
  }

  /**
   * Process metadata changes to update asset state
   */
  private processMetadataChanges(
    metadata: any,
    currentState: { status: string; condition: string },
  ): { status: string; condition: string } {
    let { status, condition } = currentState;

    // Check for status changes in the metadata.changes array
    if (metadata?.changes) {
      for (const change of metadata.changes) {
        if (change.fieldName === 'status' && change.newValue) {
          status = change.newValue;
        }
        if (change.fieldName === 'condition' && change.newValue) {
          condition = change.newValue;
        }
      }
    }

    // Also check for direct status/condition in metadata (for events like ASSET_ISSUED, ASSET_COLLECTED)
    if (metadata?.newStatus) {
      status = metadata.newStatus;
    }
    if (metadata?.newCondition) {
      condition = metadata.newCondition;
    }

    return { status, condition };
  }

  /**
   * Process historical events to reconstruct asset state
   */
  private async processHistoricalEvents(
    assetId: number,
    eventDate: Date,
    initialState: { status: string; condition: string },
  ): Promise<{ status: string; condition: string }> {
    // Get all events for this asset up to the specified event date (excluding the current event)
    const eventsUpToDate = await this.prisma.assetEvent.findMany({
      where: {
        assetId: assetId,
        eventDate: {
          lt: eventDate, // Use lt instead of lte to exclude the current event
        },
      },
      orderBy: { eventDate: 'asc' },
      select: {
        eventType: true,
        eventDate: true,
        metadata: true,
      },
    });

    // Apply each event's changes chronologically to reconstruct the state
    let currentState = initialState;
    for (const historicalEvent of eventsUpToDate) {
      const metadata = historicalEvent.metadata as any;
      currentState = this.processMetadataChanges(metadata, currentState);
    }

    return currentState;
  }

  /**
   * Get asset status and condition at the time of event
   * Reconstructs the asset state by looking at all events up to that point
   */
  private async getAssetStateAtEvent(
    assetId: number,
    eventDate: Date,
    event?: any,
  ): Promise<{ status: string; condition: string }> {
    // Get the asset's current state (fallback)
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      select: {
        status: true,
        condition: true,
        createdAt: true,
      },
    });

    if (!asset) {
      return { status: 'UNKNOWN', condition: 'UNKNOWN' };
    }

    // Get initial state from creation event
    const initialState = await this.getInitialAssetState(assetId);

    // Process historical events to reconstruct the state
    return await this.processHistoricalEvents(assetId, eventDate, initialState);
  }

  /**
   * Build asset issue/return event from AssetIssue table
   */
  private async buildAssetIssueEvent(
    issue: any,
    asset: any,
    eventType: AssetEventType.ASSET_ISSUED | AssetEventType.ASSET_COLLECTED,
  ): Promise<AssetHistoryEventDto> {
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
        notes: issue.notes,
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
        notes: issue.notes,
      };
    }

    // Get asset state at the time of this event
    const assetState = await this.getAssetStateAtEvent(
      asset.id,
      eventDate,
      issue,
    );

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
      condition: assetState.condition,
    };
  }

  /**
   * Helper method to determine status display for events
   */
  private getStatusDisplay(
    event: any,
    assetState: { status: string; condition: string },
  ): string {
    if (event.eventType === AssetEventType.ASSET_UPDATED) {
      // Check for status change in metadata changes array
      const statusChange = event.metadata?.changes?.find(
        (change: any) => change.fieldName === 'status',
      );
      if (statusChange) {
        return `${statusChange.oldValue} → ${statusChange.newValue}`;
      }
      return assetState.status;
    }

    // For other event types, check for status transition in metadata
    if (event.metadata?.previousStatus && event.metadata?.newStatus) {
      return `${event.metadata.previousStatus} → ${event.metadata.newStatus}`;
    }

    return assetState.status;
  }

  /**
   * Helper method to determine condition display for events
   */
  private getConditionDisplay(
    event: any,
    assetState: { status: string; condition: string },
  ): string {
    if (event.eventType === AssetEventType.ASSET_UPDATED) {
      // Check for condition change in metadata changes array
      const conditionChange = event.metadata?.changes?.find(
        (change: any) => change.fieldName === 'condition',
      );
      if (conditionChange) {
        return `${conditionChange.oldValue} → ${conditionChange.newValue}`;
      }
      return assetState.condition;
    }

    // For other event types, check for condition transition in metadata
    if (event.metadata?.previousCondition && event.metadata?.newCondition) {
      return `${event.metadata.previousCondition} → ${event.metadata.newCondition}`;
    }

    return assetState.condition;
  }

  /**
   * Helper method to determine status display for events with special handling for maintenance updates
   */
  private getStatusDisplayForEvent(
    event: any,
    assetState: { status: string; condition: string },
  ): string {
    if (event.eventType === AssetEventType.MAINTENANCE_UPDATED) {
      // For maintenance updates, check the maintenance status in metadata
      const maintenanceStatus = event.metadata?.status;
      if (
        maintenanceStatus === 'SCHEDULED' ||
        maintenanceStatus === 'IN_PROGRESS'
      ) {
        return assetState.status; // Keep asset status for maintenance events
      }
    }

    return this.getStatusDisplay(event, assetState);
  }

  /**
   * Build consolidated asset history event
   */
  private async buildAssetHistoryEvent(
    event: any,
    asset: any,
  ): Promise<AssetHistoryEventDto> {
    const { icon, color } = this.getEventIconAndColor(event.eventType);
    const userInfo = this.buildUserInfo(event.performedByUser);

    // Get asset state at the time of this event
    const assetState = await this.getAssetStateAtEvent(
      asset.id,
      event.eventDate,
      event,
    );

    // Determine status display using helper method
    const statusDisplay = this.getStatusDisplayForEvent(event, assetState);

    // Determine condition display using helper method
    const conditionDisplay = this.getConditionDisplay(event, assetState);

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
      condition: conditionDisplay,
    };
  }

  /**
   * Get asset history with pagination and filtering
   */
  async getAssetHistory(
    idOrCode: string,
    query: AssetHistoryQueryDto,
  ): Promise<AssetHistoryResponseDto> {
    const asset = await this.getAssetByIdOrCode(idOrCode);

    // Build where clause
    const where: any = {
      assetId: asset.id,
    };

    // Filter by event types
    if (query.eventTypes) {
      const eventTypes = query.eventTypes.split(',').map((type) => type.trim());
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
        { reason: { contains: query.search, mode: 'insensitive' } },
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
            include: { employee: true },
          },
        },
        orderBy: {
          eventDate: query.sortOrder === 'asc' ? 'asc' : 'desc',
        },
      }),
      this.prisma.assetEvent.count({ where }),
    ]);

    // Combine and sort all events (only AssetEvent records now)
    const allEvents = events.map((event) => ({
      type: 'event',
      data: event,
      date: event.eventDate,
    }));

    // Sort by date
    allEvents.sort((a, b) => {
      const dateA = new Date(a.date || new Date());
      const dateB = new Date(b.date || new Date());
      return query.sortOrder === 'asc'
        ? dateA.getTime() - dateB.getTime()
        : dateB.getTime() - dateA.getTime();
    });

    // Apply pagination to combined results
    const paginatedEvents = allEvents.slice(skip, skip + limit);

    // Build timeline (only AssetEvent records now)
    const timeline = await Promise.all(
      paginatedEvents
        .filter((item) => item.type === 'event')
        .map((item) => this.buildAssetHistoryEvent(item.data, asset)),
    );

    // Build pagination info
    const totalCount = totalEvents;
    const totalPages = Math.ceil(totalCount / limit);
    const pagination = {
      currentPage: page,
      totalPages,
      totalEvents: totalCount,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
      limit,
    };

    return {
      timestamp: new Date().toISOString(),
      description: 'Asset history retrieved successfully',
      asset: this.buildAssetBasicInfo(asset),
      timeline,
      pagination,
    };
  }

  /**
   * Get asset history summary
   */
  async getAssetHistorySummary(
    idOrCode: string,
    query: AssetHistoryQueryDto = {},
  ): Promise<AssetHistorySummaryResponseDto> {
    const asset = await this.getAssetByIdOrCode(idOrCode);

    // Build where clause for filtering
    const where: any = {
      assetId: asset.id,
    };

    // Filter by event types
    if (query.eventTypes) {
      const eventTypes = query.eventTypes.split(',').map((type) => type.trim());
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
        { reason: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Get all events for summary (only AssetEvent records now)
    const events = await this.prisma.assetEvent.findMany({
      where,
      include: {
        performedByUser: {
          include: { employee: true },
        },
      },
      orderBy: { eventDate: 'desc' },
    });

    // Combine and sort all events (only AssetEvent records now)
    const allEvents = events.map((event) => ({
      type: 'event',
      data: event,
      date: event.eventDate,
    }));

    // Sort by date (most recent first)
    allEvents.sort(
      (a, b) =>
        new Date(b.date || new Date()).getTime() -
        new Date(a.date || new Date()).getTime(),
    );

    // Calculate summary statistics
    const totalEvents = allEvents.length;
    const lastActivity =
      allEvents.length > 0
        ? allEvents[0].date || asset.updatedAt
        : asset.updatedAt;

    // Count events by type
    const eventCounts = allEvents.reduce(
      (acc, item) => {
        if (item.type === 'event' && 'eventType' in item.data) {
          acc[item.data.eventType] = (acc[item.data.eventType] || 0) + 1;
        } else if (item.type === 'issue') {
          acc[AssetEventType.ASSET_ISSUED] =
            (acc[AssetEventType.ASSET_ISSUED] || 0) + 1;
        } else if (item.type === 'return') {
          acc[AssetEventType.ASSET_COLLECTED] =
            (acc[AssetEventType.ASSET_COLLECTED] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const totalAssignments = eventCounts[AssetEventType.ASSET_ISSUED] || 0;
    const totalMaintenance =
      (eventCounts[AssetEventType.MAINTENANCE_SCHEDULED] || 0) +
      (eventCounts[AssetEventType.MAINTENANCE_UPDATED] || 0) +
      (eventCounts[AssetEventType.MAINTENANCE_COMPLETED] || 0) +
      (eventCounts[AssetEventType.MAINTENANCE_CANCELLED] || 0);
    const totalStatusChanges = events.filter(
      (event) =>
        event.eventType === AssetEventType.ASSET_UPDATED &&
        event.fieldName === 'status',
    ).length;

    // Calculate total cost (from asset updates with cost changes)
    const totalCost = events
      .filter(
        (event) =>
          event.eventType === AssetEventType.ASSET_UPDATED &&
          event.fieldName === 'purchaseCost',
      )
      .reduce((sum, event) => {
        const cost = this.formatDecimal((event as any).newValue);
        return sum + (cost || 0);
      }, 0);

    // Get recent events (last 5) - only AssetEvent records now
    const recentEvents = await Promise.all(
      allEvents
        .slice(0, 5)
        .filter((item) => item.type === 'event')
        .map((item) => this.buildAssetHistoryEvent(item.data, asset)),
    );

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
      eventCounts,
    };

    // Build quick stats
    const quickStats: QuickStatsDto = {
      mostCommonStatus: asset.status,
      mostCommonCondition: asset.condition,
      maintenanceFrequency: totalMaintenance > 0 ? 'Regular' : 'None',
      avgAssignmentDuration: totalAssignments > 0 ? 'Active' : 'N/A',
    };

    return {
      timestamp: new Date().toISOString(),
      description: 'Asset history summary retrieved successfully',
      asset: this.buildAssetBasicInfo(asset),
      summary,
      recentEvents,
      quickStats,
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
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.exec(value)) {
        return value; // Already in correct format
      }

      // Try to parse as a date (handles ISO format, full timestamp strings, etc.)
      try {
        const date = new Date(value);
        // Check if it's a valid date and not a regular string
        if (
          !Number.isNaN(date.getTime()) &&
          date.getFullYear() > 1900 &&
          date.getFullYear() < 2100
        ) {
          return date.toISOString().split('T')[0]; // yyyy-mm-dd format
        }
      } catch (e) {
        // If parsing fails, return as-is
        console.warn(`Failed to parse date value: ${value}`, e);
      }
    }

    // Return as-is for all other values (numbers, non-date strings, etc.)
    return value.toString();
  }

  /**
   * Process date string values for formatting
   */
  private processDateString(value: string): string | null {
    // Check if it's already in yyyy-mm-dd format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.exec(value)) {
      return value; // Already in correct format
    }

    // Try to parse as a date (handles ISO format, full timestamp strings, etc.)
    try {
      const date = new Date(value);
      // Check if it's a valid date
      if (
        !Number.isNaN(date.getTime()) &&
        date.getFullYear() > 1900 &&
        date.getFullYear() < 2100
      ) {
        return date.toISOString().split('T')[0]; // yyyy-mm-dd format
      }
    } catch (e) {
      // If parsing fails, return as-is
      console.warn(`Failed to parse date value: ${value}`, e);
    }

    return null;
  }

  /**
   * Format date values for display in changes array (field-specific formatting)
   * Only formats values for known date fields
   */
  private formatDateValueForField(
    value: any,
    fieldName: string,
  ): string | null {
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
      'returnDate',
    ];

    // Only format if it's a known date field
    if (dateFields.includes(fieldName)) {
      // Handle Date objects
      if (value instanceof Date) {
        return value.toISOString().split('T')[0]; // yyyy-mm-dd format
      }

      // Handle date strings
      if (typeof value === 'string') {
        const formattedDate = this.processDateString(value);
        if (formattedDate !== null) {
          return formattedDate;
        }
      }
    }

    // For non-date fields, return as-is
    return value?.toString() || null;
  }
}

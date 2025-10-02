import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AssetAuditService } from '../assets/asset-audit.service';
import { TimezoneUtil } from '../../shared/utils/timezone.util';
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
   * Format field names for display
   */
  private formatFieldName(fieldName: string): string {
    const fieldMap: { [key: string]: string } = {
      'assetId': 'Asset ID',
      'asset_id': 'Asset ID',
      'serialNumber': 'Serial Number',
      'serial_number': 'Serial Number',
      'purchaseDate': 'Purchase Date',
      'purchase_date': 'Purchase Date',
      'purchaseCost': 'Purchase Cost',
      'purchase_cost': 'Purchase Cost',
      'warrantyStartDate': 'Warranty Start Date',
      'warranty_start_date': 'Warranty Start Date',
      'warrantyEndDate': 'Warranty End Date',
      'warranty_end_date': 'Warranty End Date',
      'vendorId': 'Vendor',
      'vendor_id': 'Vendor',
      'brandId': 'Brand',
      'brand_id': 'Brand',
      'modelId': 'Model',
      'model_id': 'Model',
      'assetTypeId': 'Asset Type',
      'asset_type_id': 'Asset Type',
      'notes': 'Notes',
      'qrCode': 'QR Code',
      'qr_code': 'QR Code',
      'imageUrl': 'Image',
      'image_url': 'Image',
      'location': 'Location',
      'status': 'Status',
      'condition': 'Condition'
    };

    return fieldMap[fieldName] || fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  /**
   * Format field values for display
   */
  private formatFieldValue(fieldName: string, value: string | null): string {
    if (!value) return 'None';

    // Format dates
    if (fieldName.includes('Date') || fieldName.includes('date')) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        }
      } catch (e) {
        // If date parsing fails, return original value
      }
    }

    // Format currency
    if (fieldName.includes('Cost') || fieldName.includes('cost')) {
      try {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(num);
        }
      } catch (e) {
        // If currency formatting fails, return original value
      }
    }

    // Format status/condition values
    if (fieldName === 'status' || fieldName === 'condition') {
      return value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    return value;
  }

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

    // 5. Warranty Events
    const warrantyEvents = await this.getWarrantyEvents(assetId, query);
    events.push(...warrantyEvents);

    // 6. QR Code and Image Events
    const qrImageEvents = await this.getQrImageEvents(assetId, query);
    events.push(...qrImageEvents);

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
        createdByUser: { 
          select: { 
            username: true,
            employee: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                employeeId: true
              }
            }
          } 
        },
        updatedByUser: { 
          select: { 
            username: true,
            employee: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                employeeId: true
              }
            }
          } 
        }
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
        userName: asset.createdByUser.username,
        userDisplayName: this.buildUserInfo(asset.createdByUser)?.displayName,
        details: {
          initialCondition: asset.condition,
          initialStatus: asset.status,
          purchaseDate: asset.purchaseDate?.toISOString().split('T')[0],
          purchaseCost: this.formatDecimal(asset.purchaseCost),
          location: asset.location,
          serialNumber: asset.serialNumber,
          notes: asset.notes,
          warrantyStartDate: asset.warrantyStartDate?.toISOString().split('T')[0],
          warrantyEndDate: asset.warrantyEndDate?.toISOString().split('T')[0],
          qrCode: asset.qrCode,
          imageUrl: asset.imageUrl,
          createdAt: TimezoneUtil.toISTString(asset.createdAt)
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
          estimatedCost: this.formatDecimal(maintenance.estimatedCost),
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
            description: maintenance.description
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
            actualCost: this.formatDecimal(maintenance.actualCost),
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
                email: true,
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
      let detailedDescription: string;

      // Format field names for display
      const fieldDisplayName = this.formatFieldName(log.fieldName);
      const oldValueDisplay = this.formatFieldValue(log.fieldName, log.oldValue);
      const newValueDisplay = this.formatFieldValue(log.fieldName, log.newValue);

      switch (log.changeType) {
        case 'STATUS_CHANGE':
          eventType = AssetEventType.STATUS_CHANGED;
          title = 'Status Changed';
          description = `Status changed from ${oldValueDisplay} to ${newValueDisplay}`;
          detailedDescription = `Asset status was updated from "${oldValueDisplay}" to "${newValueDisplay}"`;
          break;
        case 'CONDITION_CHANGE':
          eventType = AssetEventType.CONDITION_CHANGED;
          title = 'Condition Changed';
          description = `Condition changed from ${oldValueDisplay} to ${newValueDisplay}`;
          detailedDescription = `Asset condition was updated from "${oldValueDisplay}" to "${newValueDisplay}"`;
          break;
        case 'LOCATION_CHANGE':
          eventType = AssetEventType.LOCATION_CHANGED;
          title = 'Location Changed';
          description = `Location changed from ${oldValueDisplay || 'None'} to ${newValueDisplay || 'None'}`;
          detailedDescription = `Asset location was updated from "${oldValueDisplay || 'None'}" to "${newValueDisplay || 'None'}"`;
          break;
        case 'RETIREMENT':
          eventType = AssetEventType.RETIRED;
          title = 'Asset Retired';
          description = `Asset was retired from service`;
          detailedDescription = `Asset was retired from service. Reason: ${log.changeReason || 'Not specified'}`;
          break;
        case 'REACTIVATION':
          eventType = AssetEventType.REACTIVATED;
          title = 'Asset Reactivated';
          description = `Asset was reactivated`;
          detailedDescription = `Asset was reactivated and returned to service. Reason: ${log.changeReason || 'Not specified'}`;
          break;
        case 'ASSET_ID_CHANGE':
          eventType = AssetEventType.ASSET_UPDATED;
          title = 'Asset ID Updated';
          description = `Asset ID changed from ${oldValueDisplay} to ${newValueDisplay}`;
          detailedDescription = `Asset identifier was updated from "${oldValueDisplay}" to "${newValueDisplay}"`;
          break;
        case 'SERIAL_NUMBER_CHANGE':
          eventType = AssetEventType.SERIAL_NUMBER_UPDATED;
          title = 'Serial Number Updated';
          description = `Serial number changed from ${oldValueDisplay || 'None'} to ${newValueDisplay || 'None'}`;
          detailedDescription = `Asset serial number was updated from "${oldValueDisplay || 'None'}" to "${newValueDisplay || 'None'}"`;
          break;
        case 'PURCHASE_DATE_CHANGE':
          eventType = AssetEventType.PURCHASE_INFO_UPDATED;
          title = 'Purchase Date Updated';
          description = `Purchase date changed from ${oldValueDisplay || 'None'} to ${newValueDisplay || 'None'}`;
          detailedDescription = `Asset purchase date was updated from "${oldValueDisplay || 'None'}" to "${newValueDisplay || 'None'}"`;
          break;
        case 'PURCHASE_COST_CHANGE':
          eventType = AssetEventType.PURCHASE_INFO_UPDATED;
          title = 'Purchase Cost Updated';
          description = `Purchase cost changed from ${oldValueDisplay || 'None'} to ${newValueDisplay || 'None'}`;
          detailedDescription = `Asset purchase cost was updated from "${oldValueDisplay || 'None'}" to "${newValueDisplay || 'None'}"`;
          break;
        case 'WARRANTY_START_CHANGE':
          eventType = AssetEventType.WARRANTY_ACTIVE;
          title = 'Warranty Start Date Updated';
          description = `Warranty start date changed from ${oldValueDisplay || 'None'} to ${newValueDisplay || 'None'}`;
          detailedDescription = `Asset warranty start date was updated from "${oldValueDisplay || 'None'}" to "${newValueDisplay || 'None'}"`;
          break;
        case 'WARRANTY_END_CHANGE':
          eventType = AssetEventType.WARRANTY_ACTIVE;
          title = 'Warranty End Date Updated';
          description = `Warranty end date changed from ${oldValueDisplay || 'None'} to ${newValueDisplay || 'None'}`;
          detailedDescription = `Asset warranty end date was updated from "${oldValueDisplay || 'None'}" to "${newValueDisplay || 'None'}"`;
          break;
        case 'VENDOR_CHANGE':
          eventType = AssetEventType.VENDOR_CHANGED;
          title = 'Vendor Updated';
          description = `Vendor changed from ${oldValueDisplay || 'None'} to ${newValueDisplay || 'None'}`;
          detailedDescription = `Asset vendor was updated from "${oldValueDisplay || 'None'}" to "${newValueDisplay || 'None'}"`;
          break;
        case 'BRAND_CHANGE':
          eventType = AssetEventType.ASSET_UPDATED;
          title = 'Brand Updated';
          description = `Brand changed from ${oldValueDisplay || 'None'} to ${newValueDisplay || 'None'}`;
          detailedDescription = `Asset brand was updated from "${oldValueDisplay || 'None'}" to "${newValueDisplay || 'None'}"`;
          break;
        case 'MODEL_CHANGE':
          eventType = AssetEventType.ASSET_UPDATED;
          title = 'Model Updated';
          description = `Model changed from ${oldValueDisplay || 'None'} to ${newValueDisplay || 'None'}`;
          detailedDescription = `Asset model was updated from "${oldValueDisplay || 'None'}" to "${newValueDisplay || 'None'}"`;
          break;
        case 'ASSET_TYPE_CHANGE':
          eventType = AssetEventType.ASSET_UPDATED;
          title = 'Asset Type Updated';
          description = `Asset type changed from ${oldValueDisplay || 'None'} to ${newValueDisplay || 'None'}`;
          detailedDescription = `Asset type was updated from "${oldValueDisplay || 'None'}" to "${newValueDisplay || 'None'}"`;
          break;
        case 'NOTES_CHANGE':
          eventType = AssetEventType.ASSET_UPDATED;
          title = 'Notes Updated';
          description = `Asset notes were updated`;
          detailedDescription = `Asset notes were updated. Previous: "${oldValueDisplay || 'None'}" → New: "${newValueDisplay || 'None'}"`;
          break;
        case 'QR_CODE_CHANGE':
          eventType = AssetEventType.QR_CODE_GENERATED;
          title = 'QR Code Updated';
          description = `QR code was updated`;
          detailedDescription = `Asset QR code was updated from "${oldValueDisplay || 'None'}" to "${newValueDisplay || 'None'}"`;
          break;
        case 'IMAGE_UPLOAD':
          eventType = AssetEventType.IMAGE_UPLOADED;
          title = 'Image Updated';
          description = `Asset image was updated`;
          detailedDescription = `Asset image was updated from "${oldValueDisplay || 'None'}" to "${newValueDisplay || 'None'}"`;
          break;
        case 'BULK_UPDATE':
          eventType = AssetEventType.ASSET_UPDATED;
          title = 'Asset Updated';
          
          // Parse grouped changes from JSON
          let groupedChanges: any[] = [];
          let statusChange = null;
          let conditionChange = null;
          let otherChanges: any[] = [];
          
          try {
            const oldValues = JSON.parse(log.oldValue || '[]');
            const newValues = JSON.parse(log.newValue || '[]');
            
            // Combine old and new values
            groupedChanges = oldValues.map((oldItem: any, index: number) => ({
              field: oldItem.field,
              oldValue: oldItem.oldValue,
              newValue: newValues[index]?.newValue || null
            }));
            
            // Separate status, condition, and other changes
            statusChange = groupedChanges.find(c => c.field === 'status');
            conditionChange = groupedChanges.find(c => c.field === 'condition');
            otherChanges = groupedChanges.filter(c => c.field !== 'status' && c.field !== 'condition');
            
          } catch (error) {
            console.error('Error parsing grouped changes:', error);
            groupedChanges = [];
          }
          
          // Build description based on changes
          const changeDescriptions: string[] = [];
          
          if (statusChange) {
            const oldStatus = this.formatFieldValue('status', (statusChange as any).oldValue);
            const newStatus = this.formatFieldValue('status', (statusChange as any).newValue);
            changeDescriptions.push(`Status: ${oldStatus} → ${newStatus}`);
          }
          
          if (conditionChange) {
            const oldCondition = this.formatFieldValue('condition', (conditionChange as any).oldValue);
            const newCondition = this.formatFieldValue('condition', (conditionChange as any).newValue);
            changeDescriptions.push(`Condition: ${oldCondition} → ${newCondition}`);
          }
          
          // Add other changes
          otherChanges.forEach(change => {
            const fieldName = this.formatFieldName(change.field);
            const oldValue = this.formatFieldValue(change.field, change.oldValue);
            const newValue = this.formatFieldValue(change.field, change.newValue);
            changeDescriptions.push(`${fieldName}: ${oldValue} → ${newValue}`);
          });
          
          description = changeDescriptions.join(', ');
          detailedDescription = `Asset was updated with the following changes: ${changeDescriptions.join('; ')}`;
          break;
        default:
          eventType = AssetEventType.ASSET_UPDATED;
          title = `${fieldDisplayName} Updated`;
          description = `${fieldDisplayName} changed from ${oldValueDisplay || 'None'} to ${newValueDisplay || 'None'}`;
          detailedDescription = `Asset ${fieldDisplayName.toLowerCase()} was updated from "${oldValueDisplay || 'None'}" to "${newValueDisplay || 'None'}"`;
      }

      // Prepare details object
      const details: any = {
        fieldName: log.fieldName,
        fieldDisplayName,
        oldValue: log.oldValue,
        newValue: log.newValue,
        oldValueDisplay,
        newValueDisplay,
        changeReason: log.changeReason,
        detailedDescription,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        notes: log.notes,
        changeType: log.changeType,
        timestamp: log.changedAt.toISOString(),
        timestampIST: TimezoneUtil.toISTString(log.changedAt),
        user: {
          id: log.changedBy,
          username: log.changedByUser.username,
          displayName: this.buildUserInfo(log.changedByUser)?.displayName,
          email: log.changedByUser.employee?.email,
          employeeId: log.changedByUser.employee?.employeeId
        }
      };

      // Add grouped changes information for BULK_UPDATE
      if (log.changeType === 'BULK_UPDATE') {
        try {
          const oldValues = JSON.parse(log.oldValue || '[]');
          const newValues = JSON.parse(log.newValue || '[]');
          
          const groupedChanges = oldValues.map((oldItem: any, index: number) => ({
            field: oldItem.field,
            fieldDisplayName: this.formatFieldName(oldItem.field),
            oldValue: oldItem.oldValue,
            newValue: newValues[index]?.newValue || null,
            oldValueDisplay: this.formatFieldValue(oldItem.field, oldItem.oldValue),
            newValueDisplay: this.formatFieldValue(oldItem.field, newValues[index]?.newValue || null)
          }));
          
          details.groupedChanges = groupedChanges;
          details.statusChange = groupedChanges.find((c: any) => c.field === 'status');
          details.conditionChange = groupedChanges.find((c: any) => c.field === 'condition');
          details.otherChanges = groupedChanges.filter((c: any) => c.field !== 'status' && c.field !== 'condition');
        } catch (error) {
          console.error('Error parsing grouped changes for details:', error);
        }
      }

      return {
        id: `audit-${log.id}`,
        type: eventType,
        date: log.changedAt.toISOString(),
        dateIST: TimezoneUtil.toISTString(log.changedAt),
        title,
        description,
        userId: log.changedBy,
        userName: log.changedByUser.username,
        userDisplayName: this.buildUserInfo(log.changedByUser)?.displayName,
        details,
        color: this.getEventColor(eventType),
        icon: this.getEventIcon(eventType),
      };
    });
  }

  /**
   * Get warranty events for an asset
   */
  private async getWarrantyEvents(assetId: number, query: AssetHistoryQueryDto): Promise<AssetHistoryEventDto[]> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      select: { 
        warrantyStartDate: true, 
        warrantyEndDate: true,
        updatedByUser: {
          select: {
            username: true,
            employee: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                employeeId: true
              }
            }
          }
        }
      }
    });

    if (!asset) return [];

    const events: AssetHistoryEventDto[] = [];
    const now = new Date();

    // Warranty start event
    if (asset.warrantyStartDate) {
      events.push({
        id: `warranty-started-${assetId}`,
        type: AssetEventType.WARRANTY_ACTIVE,
        date: asset.warrantyStartDate.toISOString(),
        title: 'Warranty Started',
        description: `Warranty period began for asset`,
        user: asset.updatedByUser?.username || 'System',
        userId: undefined,
        userName: asset.updatedByUser?.username,
        userDisplayName: this.buildUserInfo(asset.updatedByUser)?.displayName,
        details: {
          warrantyStartDate: asset.warrantyStartDate.toISOString().split('T')[0],
          warrantyEndDate: asset.warrantyEndDate?.toISOString().split('T')[0]
        },
        icon: 'fas fa-shield-alt',
        color: '#17a2b8'
      });
    }

    // Warranty end event
    if (asset.warrantyEndDate) {
      const isExpired = now > asset.warrantyEndDate;
      events.push({
        id: `warranty-${isExpired ? 'expired' : 'ends'}-${assetId}`,
        type: isExpired ? AssetEventType.WARRANTY_EXPIRED : AssetEventType.WARRANTY_ACTIVE,
        date: asset.warrantyEndDate.toISOString(),
        title: isExpired ? 'Warranty Expired' : 'Warranty Ends',
        description: isExpired ? 
          `Warranty period has expired` : 
          `Warranty period will end`,
        user: asset.updatedByUser?.username || 'System',
        userId: undefined,
        userName: asset.updatedByUser?.username,
        userDisplayName: this.buildUserInfo(asset.updatedByUser)?.displayName,
        details: {
          warrantyStartDate: asset.warrantyStartDate?.toISOString().split('T')[0],
          warrantyEndDate: asset.warrantyEndDate.toISOString().split('T')[0],
          isExpired
        },
        icon: isExpired ? 'fas fa-exclamation-triangle' : 'fas fa-shield-alt',
        color: isExpired ? '#dc3545' : '#ffc107'
      });
    }

    return events;
  }

  /**
   * Get QR code and image upload events for an asset
   */
  private async getQrImageEvents(assetId: number, query: AssetHistoryQueryDto): Promise<AssetHistoryEventDto[]> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      select: { 
        qrCode: true, 
        imageUrl: true,
        updatedByUser: {
          select: {
            username: true,
            employee: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                employeeId: true
              }
            }
          }
        }
      }
    });

    if (!asset) return [];

    const events: AssetHistoryEventDto[] = [];

    // QR Code generation event
    if (asset.qrCode) {
      events.push({
        id: `qr-generated-${assetId}`,
        type: AssetEventType.QR_CODE_GENERATED,
        date: new Date().toISOString(), // This should ideally come from audit log
        title: 'QR Code Generated',
        description: `QR code was generated for asset`,
        user: asset.updatedByUser?.username || 'System',
        userId: undefined,
        userName: asset.updatedByUser?.username,
        userDisplayName: this.buildUserInfo(asset.updatedByUser)?.displayName,
        details: {
          qrCode: asset.qrCode
        },
        icon: 'fas fa-qrcode',
        color: '#6f42c1'
      });
    }

    // Image upload event
    if (asset.imageUrl) {
      events.push({
        id: `image-uploaded-${assetId}`,
        type: AssetEventType.IMAGE_UPLOADED,
        date: new Date().toISOString(), // This should ideally come from audit log
        title: 'Image Uploaded',
        description: `Asset image was uploaded`,
        user: asset.updatedByUser?.username || 'System',
        userId: undefined,
        userName: asset.updatedByUser?.username,
        userDisplayName: this.buildUserInfo(asset.updatedByUser)?.displayName,
        details: {
          imageUrl: asset.imageUrl
        },
        icon: 'fas fa-image',
        color: '#20c997'
      });
    }

    return events;
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
      case AssetEventType.LOCATION_UPDATED:
        return '#10b981'; // Emerald
      case AssetEventType.RETIRED:
        return '#ef4444'; // Red
      case AssetEventType.REACTIVATED:
        return '#8b5cf6'; // Violet
      case AssetEventType.ASSET_UPDATED:
        return '#6b7280'; // Gray
      case AssetEventType.WARRANTY_EXPIRED:
        return '#dc3545'; // Red
      case AssetEventType.WARRANTY_RENEWED:
        return '#28a745'; // Green
      case AssetEventType.WARRANTY_ACTIVE:
        return '#17a2b8'; // Cyan
      case AssetEventType.QR_CODE_GENERATED:
        return '#6f42c1'; // Purple
      case AssetEventType.IMAGE_UPLOADED:
        return '#20c997'; // Teal
      case AssetEventType.SERIAL_NUMBER_UPDATED:
        return '#fd7e14'; // Orange
      case AssetEventType.PURCHASE_INFO_UPDATED:
        return '#6c757d'; // Gray
      case AssetEventType.VENDOR_CHANGED:
        return '#e83e8c'; // Pink
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
      case AssetEventType.LOCATION_UPDATED:
        return 'fas fa-map-marker-alt';
      case AssetEventType.RETIRED:
        return 'fas fa-ban';
      case AssetEventType.REACTIVATED:
        return 'fas fa-redo';
      case AssetEventType.ASSET_UPDATED:
        return 'fas fa-edit';
      case AssetEventType.WARRANTY_EXPIRED:
        return 'fas fa-exclamation-triangle';
      case AssetEventType.WARRANTY_RENEWED:
        return 'fas fa-shield-alt';
      case AssetEventType.WARRANTY_ACTIVE:
        return 'fas fa-shield-alt';
      case AssetEventType.QR_CODE_GENERATED:
        return 'fas fa-qrcode';
      case AssetEventType.IMAGE_UPLOADED:
        return 'fas fa-image';
      case AssetEventType.SERIAL_NUMBER_UPDATED:
        return 'fas fa-barcode';
      case AssetEventType.PURCHASE_INFO_UPDATED:
        return 'fas fa-shopping-cart';
      case AssetEventType.VENDOR_CHANGED:
        return 'fas fa-building';
      default:
        return 'fas fa-info-circle';
    }
  }
}

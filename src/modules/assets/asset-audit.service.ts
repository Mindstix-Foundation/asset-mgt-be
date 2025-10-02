import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditChangeType } from '@prisma/client';

export interface AssetChangeData {
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changeType: AuditChangeType;
  changeReason?: string;
  changedBy: number;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
}

export interface GroupedAssetChangeData {
  assetId: number;
  changes: AssetChangeData[];
  changeReason?: string;
  changedBy: number;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
  timestamp?: Date;
}

@Injectable()
export class AssetAuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log a single field change for an asset
   */
  async logAssetChange(
    assetId: number,
    changeData: AssetChangeData
  ): Promise<void> {
    try {
      await this.prisma.assetAuditLog.create({
        data: {
          assetId,
          fieldName: changeData.fieldName,
          oldValue: changeData.oldValue,
          newValue: changeData.newValue,
          changeType: changeData.changeType,
          changeReason: changeData.changeReason,
          changedBy: changeData.changedBy,
          ipAddress: changeData.ipAddress,
          userAgent: changeData.userAgent,
          notes: changeData.notes,
        },
      });
    } catch (error) {
      console.error('❌ Error logging asset change:', {
        error: error.message,
        assetId,
        changeData,
        timestamp: new Date().toISOString()
      });
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Log multiple field changes for an asset
   */
  async logAssetChanges(
    assetId: number,
    changes: AssetChangeData[]
  ): Promise<void> {
    try {
      const auditLogs = changes.map(change => ({
        assetId,
        fieldName: change.fieldName,
        oldValue: change.oldValue,
        newValue: change.newValue,
        changeType: change.changeType,
        changeReason: change.changeReason,
        changedBy: change.changedBy,
        ipAddress: change.ipAddress,
        userAgent: change.userAgent,
        notes: change.notes,
      }));

      await this.prisma.assetAuditLog.createMany({
        data: auditLogs,
      });
    } catch (error) {
      console.error('❌ Error logging asset changes:', {
        error: error.message,
        assetId,
        changes,
        timestamp: new Date().toISOString()
      });
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Log grouped asset changes as a single event
   * This creates one audit log entry that represents multiple field changes
   */
  async logGroupedAssetChanges(
    groupedChangeData: GroupedAssetChangeData
  ): Promise<void> {
    try {
      const { assetId, changes, changeReason, changedBy, ipAddress, userAgent, notes, timestamp } = groupedChangeData;
      
      if (changes.length === 0) {
        return; // No changes to log
      }

      // Create a single audit log entry for the grouped changes
      const auditLog = {
        assetId,
        fieldName: 'MULTIPLE_FIELDS', // Special field name to indicate grouped changes
        oldValue: JSON.stringify(changes.map(c => ({ field: c.fieldName, oldValue: c.oldValue }))),
        newValue: JSON.stringify(changes.map(c => ({ field: c.fieldName, newValue: c.newValue }))),
        changeType: 'BULK_UPDATE' as AuditChangeType,
        changeReason,
        changedBy,
        ipAddress,
        userAgent,
        notes,
        createdAt: timestamp || new Date(),
      };

      await this.prisma.assetAuditLog.create({
        data: auditLog,
      });

      console.log('✅ Grouped asset changes logged:', {
        assetId,
        changesCount: changes.length,
        fields: changes.map(c => c.fieldName),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error logging grouped asset changes:', {
        error: error.message,
        groupedChangeData,
        timestamp: new Date().toISOString()
      });
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Log asset status change
   */
  async logStatusChange(
    assetId: number,
    oldStatus: string,
    newStatus: string,
    changedBy: number,
    changeReason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAssetChange(assetId, {
      fieldName: 'status',
      oldValue: oldStatus,
      newValue: newStatus,
      changeType: AuditChangeType.STATUS_CHANGE,
      changeReason,
      changedBy,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log asset condition change
   */
  async logConditionChange(
    assetId: number,
    oldCondition: string,
    newCondition: string,
    changedBy: number,
    changeReason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAssetChange(assetId, {
      fieldName: 'condition',
      oldValue: oldCondition,
      newValue: newCondition,
      changeType: AuditChangeType.CONDITION_CHANGE,
      changeReason,
      changedBy,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log asset location change
   */
  async logLocationChange(
    assetId: number,
    oldLocation: string | null,
    newLocation: string | null,
    changedBy: number,
    changeReason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAssetChange(assetId, {
      fieldName: 'location',
      oldValue: oldLocation,
      newValue: newLocation,
      changeType: AuditChangeType.LOCATION_CHANGE,
      changeReason,
      changedBy,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log asset retirement
   */
  async logRetirement(
    assetId: number,
    retirementReason: string,
    changedBy: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAssetChange(assetId, {
      fieldName: 'status',
      oldValue: 'AVAILABLE', // or whatever the previous status was
      newValue: 'RETIRED',
      changeType: AuditChangeType.RETIREMENT,
      changeReason: retirementReason,
      changedBy,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log asset reactivation
   */
  async logReactivation(
    assetId: number,
    reactivationReason: string,
    changedBy: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAssetChange(assetId, {
      fieldName: 'status',
      oldValue: 'RETIRED',
      newValue: 'AVAILABLE',
      changeType: AuditChangeType.REACTIVATION,
      changeReason: reactivationReason,
      changedBy,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log asset field update with specific change type
   */
  async logFieldUpdate(
    assetId: number,
    fieldName: string,
    oldValue: string | null,
    newValue: string | null,
    changedBy: number,
    changeReason?: string,
    notes?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    let changeType: AuditChangeType = AuditChangeType.FIELD_UPDATE;
    
    // Map specific field names to change types
    switch (fieldName.toLowerCase()) {
      case 'assetid':
      case 'asset_id':
        changeType = AuditChangeType.ASSET_ID_CHANGE;
        break;
      case 'serialnumber':
      case 'serial_number':
        changeType = AuditChangeType.SERIAL_NUMBER_CHANGE;
        break;
      case 'purchasedate':
      case 'purchase_date':
        changeType = AuditChangeType.PURCHASE_DATE_CHANGE;
        break;
      case 'purchasecost':
      case 'purchase_cost':
        changeType = AuditChangeType.PURCHASE_COST_CHANGE;
        break;
      case 'warrantystartdate':
      case 'warranty_start_date':
        changeType = AuditChangeType.WARRANTY_START_CHANGE;
        break;
      case 'warrantyenddate':
      case 'warranty_end_date':
        changeType = AuditChangeType.WARRANTY_END_CHANGE;
        break;
      case 'vendorid':
      case 'vendor_id':
        changeType = AuditChangeType.VENDOR_CHANGE;
        break;
      case 'brandid':
      case 'brand_id':
        changeType = AuditChangeType.BRAND_CHANGE;
        break;
      case 'modelid':
      case 'model_id':
        changeType = AuditChangeType.MODEL_CHANGE;
        break;
      case 'assettypeid':
      case 'asset_type_id':
        changeType = AuditChangeType.ASSET_TYPE_CHANGE;
        break;
      case 'notes':
        changeType = AuditChangeType.NOTES_CHANGE;
        break;
      case 'qrcode':
      case 'qr_code':
        changeType = AuditChangeType.QR_CODE_CHANGE;
        break;
      case 'imageurl':
      case 'image_url':
        changeType = AuditChangeType.IMAGE_UPLOAD;
        break;
    }

    await this.logAssetChange(assetId, {
      fieldName,
      oldValue,
      newValue,
      changeType,
      changeReason,
      changedBy,
      ipAddress,
      userAgent,
      notes,
    });
  }

  /**
   * Log bulk asset updates
   */
  async logBulkUpdate(
    assetId: number,
    changes: Array<{
      fieldName: string;
      oldValue: string | null;
      newValue: string | null;
    }>,
    changedBy: number,
    changeReason?: string,
    notes?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const auditChanges = changes.map(change => ({
      fieldName: change.fieldName,
      oldValue: change.oldValue,
      newValue: change.newValue,
      changeType: AuditChangeType.BULK_UPDATE,
      changeReason,
      changedBy,
      ipAddress,
      userAgent,
      notes,
    }));

    await this.logAssetChanges(assetId, auditChanges);
  }

  /**
   * Get audit logs for an asset
   */
  async getAssetAuditLogs(
    assetId: number,
    limit: number = 100,
    offset: number = 0
  ) {
    return await this.prisma.assetAuditLog.findMany({
      where: { assetId },
      include: {
        changedByUser: {
          select: {
            id: true,
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
      take: limit,
      skip: offset,
    });
  }
}

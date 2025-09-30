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

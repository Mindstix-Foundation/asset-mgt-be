import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { NotificationType } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { QueryNotificationDto } from './dto/query-notification.dto';

/** In-app reminder types shown in the notification inbox */
const REMINDER_NOTIFICATION_TYPES: NotificationType[] = [
  NotificationType.MAINTENANCE_REMINDER,
  NotificationType.WARRANTY_EXPIRING,
  NotificationType.WARRANTY_EXPIRED,
  NotificationType.LICENSE_EXPIRING,
  NotificationType.LICENSE_EXPIRED,
];

const EXPIRY_LEAD_DAYS = 30;
const EXPIRED_LOOKBACK_DAYS = 7;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async createNotification(
    userId: number,
    type: NotificationType,
    title: string,
    message: string,
    data?: any,
    tenantId?: number,
  ) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          data: data ?? undefined,
          tenantId: tenantId!,
        },
      });

      // Clean up old notifications to keep only the most recent 100
      await this.cleanupOldNotifications(userId);

      return notification;
    } catch (error) {
      this.logger.error('Failed to create notification', error?.stack || error);
      throw error;
    }
  }

  async getUserNotifications(userId: number, tenantId: number, query: QueryNotificationDto = {}) {
    try {
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 100);
      const skip = (page - 1) * limit;

      const where = {
        userId,
        tenantId,
        type: { in: REMINDER_NOTIFICATION_TYPES },
        ...(query.unreadOnly ? { isRead: false } : {}),
      };

      const [totalCount, notifications] = await Promise.all([
        this.prisma.notification.count({ where }),
        this.prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      const totalPages = Math.max(1, Math.ceil(totalCount / limit));

      return {
        message: 'Notifications retrieved successfully',
        data: {
          notifications: notifications.map((notification) => ({
            ...notification,
            data: this.parseNotificationData(notification.data),
          })),
          pagination: {
            totalCount,
            currentPage: page,
            totalPages,
            hasNext: page < totalPages,
            hasPrevious: page > 1,
          },
        },
      };
    } catch (error) {
      this.logger.error(
        'Failed to fetch user notifications',
        error?.stack || error,
      );
      throw error;
    }
  }

  private parseNotificationData(data: unknown) {
    if (!data) return null;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    return data;
  }

  async markAsRead(notificationId: number, userId: number, tenantId: number) {
    try {
      const notification = await this.prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId,
          tenantId,
          isRead: false,
          type: { in: REMINDER_NOTIFICATION_TYPES },
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return notification.count > 0;
    } catch (error) {
      this.logger.error(
        'Failed to mark notification as read',
        error?.stack || error,
      );
      throw error;
    }
  }

  async markAsUnread(notificationId: number, userId: number, tenantId: number) {
    try {
      const notification = await this.prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId,
          tenantId,
          isRead: true,
          type: { in: REMINDER_NOTIFICATION_TYPES },
        },
        data: {
          isRead: false,
          readAt: null,
        },
      });

      return notification.count > 0;
    } catch (error) {
      this.logger.error(
        'Failed to mark notification as unread',
        error?.stack || error,
      );
      throw error;
    }
  }

  async markAllAsRead(userId: number, tenantId: number) {
    try {
      const result = await this.prisma.notification.updateMany({
        where: {
          userId,
          tenantId,
          isRead: false,
          type: { in: REMINDER_NOTIFICATION_TYPES },
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return result.count;
    } catch (error) {
      this.logger.error(
        'Failed to mark all notifications as read',
        error?.stack || error,
      );
      throw error;
    }
  }

  async getUnreadCount(userId: number, tenantId: number) {
    try {
      const count = await this.prisma.notification.count({
        where: {
          userId,
          tenantId,
          isRead: false,
          type: { in: REMINDER_NOTIFICATION_TYPES },
        },
      });

      return count;
    } catch (error) {
      this.logger.error(
        'Failed to get unread notification count',
        error?.stack || error,
      );
      throw error;
    }
  }

  async sendMaintenanceReminderEmail(
    userEmail: string,
    maintenanceData: {
      assetId: string;
      assetType: string;
      brand: string;
      model: string;
      maintenanceType: string;
      scheduledDate: string;
    },
  ) {
    try {
      const smtpHost = this.configService.get('SMTP_HOST');
      const smtpPort = this.configService.get('SMTP_PORT');
      const smtpUser = this.configService.get('SMTP_USER');
      const smtpPass = this.configService.get('SMTP_PASS');

      if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
        this.logger.error(
          'SMTP configuration is incomplete. Cannot send maintenance reminder email.',
        );
        return false;
      }

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number.parseInt(smtpPort.toString(), 10),
        secure: Number.parseInt(smtpPort.toString(), 10) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const frontendUrl =
        this.configService.get('FRONTEND_URL') || 'http://localhost:5173';

      await transporter.sendMail({
        from:
          this.configService.get('SMTP_FROM') ||
          '"Pebble Asset Tracker Support" <pebble-asset-tracker.noreply@gmail.com>',
        to: userEmail,
        subject: 'Maintenance Reminder - Pebble Asset Tracker Asset Management',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Maintenance Reminder</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa; line-height: 1.6;">
            <!-- Main Container -->
            <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 8px;">
              
              <!-- Header Section -->
              <div style="background-color: #212529; color: #ffffff; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Pebble Asset Tracker Asset Management</h1>
                <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.9;">Maintenance Reminder</p>
              </div>

              <!-- Content Section -->
              <div style="padding: 30px;">
                <h2 style="margin: 0 0 20px; font-size: 20px; color: #212529; font-weight: 600;">
                  Scheduled Maintenance Reminder
                </h2>

                <p style="margin: 0 0 20px; font-size: 16px; color: #495057;">
                  This is a reminder that you have scheduled maintenance that needs to be started today.
                </p>

                <!-- Maintenance Details Card -->
                <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <h3 style="margin: 0 0 15px; font-size: 18px; color: #212529; font-weight: 600;">Maintenance Details</h3>
                  
                  <div style="margin-bottom: 10px;">
                    <strong style="color: #495057;">Asset:</strong>
                    <span style="color: #212529; margin-left: 8px;">${maintenanceData.assetType} - ${maintenanceData.brand} ${maintenanceData.model}</span>
                  </div>
                  
                  <div style="margin-bottom: 10px;">
                    <strong style="color: #495057;">Asset ID:</strong>
                    <span style="color: #212529; margin-left: 8px;">${maintenanceData.assetId}</span>
                  </div>
                  
                  <div style="margin-bottom: 10px;">
                    <strong style="color: #495057;">Maintenance Type:</strong>
                    <span style="color: #212529; margin-left: 8px;">${maintenanceData.maintenanceType}</span>
                  </div>
                  
                  <div style="margin-bottom: 10px;">
                    <strong style="color: #495057;">Scheduled Date:</strong>
                    <span style="color: #212529; margin-left: 8px;">${maintenanceData.scheduledDate}</span>
                  </div>
                </div>

                <p style="margin: 20px 0; font-size: 16px; color: #495057;">
                  Please log in to the system and start the maintenance process to ensure your assets are properly maintained.
                </p>

                <!-- Action Button -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${frontendUrl}/app/maintenance" 
                     style="display: inline-block; background-color: #667eea; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    View Maintenance Dashboard
                  </a>
                </div>

                <p style="margin: 20px 0 0; font-size: 14px; color: #6c757d;">
                  This is an automated reminder. Please do not reply to this email.
                </p>
              </div>

              <!-- Footer -->
              <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #dee2e6;">
                <p style="margin: 0; font-size: 12px; color: #6c757d;">
                  © 2024 Pebble Asset Tracker Asset Management. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      return true;
    } catch (error) {
      this.logger.error(
        'Failed to send maintenance reminder email',
        error?.stack || error,
      );
      return false;
    }
  }

  async createMaintenanceReminderNotifications() {
    try {
      const today = new Date();
      const startOfToday = new Date(today);
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);

      // Find all scheduled maintenance for today (across all tenants; tenantId is on the record)
      const scheduledMaintenances =
        await this.prisma.maintenanceSchedule.findMany({
          where: {
            isActive: true,
            status: 'SCHEDULED',
            scheduledDate: {
              gte: startOfToday,
              lte: endOfToday,
            },
          },
          select: {
            id: true,
            maintenanceType: true,
            scheduledDate: true,
            tenantId: true,
            asset: {
              select: {
                assetId: true,
                assetType: { select: { name: true } },
                brand: { select: { name: true } },
                model: { select: { name: true } },
              },
            },
            createdByUser: {
              select: {
                id: true,
                employee: {
                  select: {
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        });

      for (const maintenance of scheduledMaintenances) {
        const user = maintenance.createdByUser;
        const asset = maintenance.asset;

        const title = 'Maintenance Reminder';
        const message = `Scheduled maintenance for ${asset.assetType.name} - ${asset.brand.name} ${asset.model.name} (${asset.assetId}) is due today. Please start the maintenance process.`;

        const notificationData = {
          maintenanceId: maintenance.id,
          assetId: asset.assetId,
          maintenanceType: maintenance.maintenanceType,
          scheduledDate: maintenance.scheduledDate.toISOString().split('T')[0],
        };

        // Create notification (with tenantId from maintenance schedule)
        await this.createNotification(
          user.id,
          NotificationType.MAINTENANCE_REMINDER,
          title,
          message,
          notificationData,
          maintenance.tenantId ?? undefined,
        );

        // Send email notification
        if (user.employee.email) {
          await this.sendMaintenanceReminderEmail(user.employee.email, {
            assetId: asset.assetId,
            assetType: asset.assetType.name,
            brand: asset.brand.name,
            model: asset.model.name,
            maintenanceType: maintenance.maintenanceType,
            scheduledDate: maintenance.scheduledDate
              .toISOString()
              .split('T')[0],
          });
        }
      }

    } catch (error) {
      this.logger.error(
        'Failed to create maintenance reminder notifications',
        error?.stack || error,
      );
    }
  }

  /** Notify tenant admins about warranties expiring soon or recently expired */
  async createWarrantyReminderNotifications() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const leadEnd = new Date(today);
      leadEnd.setDate(leadEnd.getDate() + EXPIRY_LEAD_DAYS);
      const expiredFrom = new Date(today);
      expiredFrom.setDate(expiredFrom.getDate() - EXPIRED_LOOKBACK_DAYS);

      const assets = await this.prisma.asset.findMany({
        where: {
          status: { not: 'RETIRED' },
          warrantyEndDate: {
            not: null,
            gte: expiredFrom,
            lte: leadEnd,
          },
        },
        select: {
          id: true,
          tenantId: true,
          assetId: true,
          warrantyEndDate: true,
          assetType: { select: { name: true } },
          brand: { select: { name: true } },
          model: { select: { name: true } },
        },
      });

      for (const asset of assets) {
        if (!asset.warrantyEndDate) continue;
        const end = new Date(asset.warrantyEndDate);
        end.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil(
          (end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
        );
        const isExpired = daysUntil < 0;
        const type = isExpired
          ? NotificationType.WARRANTY_EXPIRED
          : NotificationType.WARRANTY_EXPIRING;
        const title = isExpired ? 'Warranty Expired' : 'Warranty Expiring Soon';
        const message = isExpired
          ? `Warranty for ${asset.assetType.name} - ${asset.brand.name} ${asset.model.name} (${asset.assetId}) expired on ${end.toISOString().slice(0, 10)}.`
          : `Warranty for ${asset.assetType.name} - ${asset.brand.name} ${asset.model.name} (${asset.assetId}) expires in ${daysUntil} day(s) on ${end.toISOString().slice(0, 10)}.`;

        await this.notifyTenantAdmins(asset.tenantId, type, title, message, {
          assetDbId: asset.id,
          assetId: asset.assetId,
          warrantyEndDate: end.toISOString().slice(0, 10),
          daysUntilExpiry: daysUntil,
        });
      }
    } catch (error) {
      this.logger.error(
        'Failed to create warranty reminder notifications',
        error?.stack || error,
      );
    }
  }

  /** Notify assignee + tenant admins about software licenses expiring/expired */
  async createLicenseReminderNotifications() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const leadEnd = new Date(today);
      leadEnd.setDate(leadEnd.getDate() + EXPIRY_LEAD_DAYS);
      const expiredFrom = new Date(today);
      expiredFrom.setDate(expiredFrom.getDate() - EXPIRED_LOOKBACK_DAYS);

      const licenses = await this.prisma.softwareLicense.findMany({
        where: {
          isActive: true,
          expiryDate: {
            gte: expiredFrom,
            lte: leadEnd,
          },
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              user: { select: { id: true, isActive: true } },
            },
          },
        },
      });

      for (const license of licenses) {
        const end = new Date(license.expiryDate);
        end.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil(
          (end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
        );
        const isExpired = daysUntil < 0;
        const type = isExpired
          ? NotificationType.LICENSE_EXPIRED
          : NotificationType.LICENSE_EXPIRING;
        const assigneeName = `${license.assignedTo.firstName} ${license.assignedTo.lastName}`;
        const title = isExpired
          ? 'Software License Expired'
          : 'Software License Expiring Soon';
        const message = isExpired
          ? `License "${license.name}" (owner: ${assigneeName}) expired on ${end.toISOString().slice(0, 10)}.`
          : `License "${license.name}" (owner: ${assigneeName}) expires in ${daysUntil} day(s) on ${end.toISOString().slice(0, 10)}.`;

        const extraUserIds: number[] = [];
        if (license.assignedTo.user?.isActive) {
          extraUserIds.push(license.assignedTo.user.id);
        }

        await this.notifyTenantAdmins(
          license.tenantId,
          type,
          title,
          message,
          {
            licenseId: license.id,
            licenseName: license.name,
            assignedToId: license.assignedToId,
            expiryDate: end.toISOString().slice(0, 10),
            daysUntilExpiry: daysUntil,
          },
          extraUserIds,
        );
      }
    } catch (error) {
      this.logger.error(
        'Failed to create license reminder notifications',
        error?.stack || error,
      );
    }
  }

  private async notifyTenantAdmins(
    tenantId: number,
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, unknown>,
    extraUserIds: number[] = [],
  ) {
    const admins = await this.prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { roles: { has: 'ADMIN' } },
          { roles: { has: 'SUPER_ADMIN' } },
        ],
      },
      select: { id: true },
    });

    const recipientIds = [
      ...new Set([...admins.map((a) => a.id), ...extraUserIds]),
    ];

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    for (const userId of recipientIds) {
      const todays = await this.prisma.notification.findMany({
        where: {
          userId,
          tenantId,
          type,
          createdAt: { gte: startOfToday },
        },
        select: { data: true },
      });

      const alreadyNotified = todays.some((n) => {
        const payload = this.parseNotificationData(n.data) as Record<
          string,
          unknown
        > | null;
        if (!payload) return false;
        if (data.assetDbId != null) {
          return payload.assetDbId === data.assetDbId;
        }
        if (data.licenseId != null) {
          return payload.licenseId === data.licenseId;
        }
        return false;
      });

      if (alreadyNotified) continue;

      await this.createNotification(
        userId,
        type,
        title,
        message,
        data,
        tenantId,
      );
    }
  }

  /**
   * Clean up old notifications for a user, keeping only the last 100 notifications
   * @param userId - The user ID to clean up notifications for
   */
  async cleanupOldNotifications(userId: number) {
    try {
      // Get the count of notifications for this user
      const totalCount = await this.prisma.notification.count({
        where: { userId },
      });

      // If user has more than 100 notifications, delete the oldest ones
      if (totalCount > 100) {
        const notificationsToDelete = totalCount - 100;

        // Get the IDs of the oldest notifications to delete
        const oldestNotifications = await this.prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: 'asc' },
          take: notificationsToDelete,
          select: { id: true },
        });

        if (oldestNotifications.length > 0) {
          const idsToDelete = oldestNotifications.map((n) => n.id);

          // Delete the oldest notifications
          const deleteResult = await this.prisma.notification.deleteMany({
            where: {
              id: { in: idsToDelete },
            },
          });

        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to cleanup old notifications for user ${userId}`,
        error?.stack || error,
      );
      // Don't throw error to avoid breaking notification creation
    }
  }

  /**
   * Clean up old notifications for all users, keeping only the last 10 notifications per user
   * This method can be called periodically to clean up notifications across all users
   */
  async cleanupAllOldNotifications() {
    try {
      // Get all unique user IDs that have notifications
      const usersWithNotifications = await this.prisma.notification.findMany({
        select: { userId: true },
        distinct: ['userId'],
      });

      let totalCleanedUp = 0;

      for (const user of usersWithNotifications) {
        const beforeCount = await this.prisma.notification.count({
          where: { userId: user.userId },
        });

        await this.cleanupOldNotifications(user.userId);

        const afterCount = await this.prisma.notification.count({
          where: { userId: user.userId },
        });

        const cleanedForUser = beforeCount - afterCount;
        totalCleanedUp += cleanedForUser;
      }

      return totalCleanedUp;
    } catch (error) {
      this.logger.error(
        'Failed to cleanup old notifications for all users',
        error?.stack || error,
      );
      throw error;
    }
  }
}

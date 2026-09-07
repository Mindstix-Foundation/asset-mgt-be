import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../core/database/prisma.service';
import { MaintenanceStatus } from '@prisma/client';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class MaintenanceScheduler {
  private readonly logger = new Logger(MaintenanceScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  // Run hourly to catch up even if the app restarts or misses midnight
  @Cron(CronExpression.EVERY_HOUR)
  async activateScheduledMaintenances() {
    try {
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);

      const result = await this.prisma.maintenanceSchedule.updateMany({
        where: {
          isActive: true,
          status: MaintenanceStatus.SCHEDULED,
          scheduledDate: {
            lte: endOfToday,
          },
        },
        data: {
          status: MaintenanceStatus.IN_PROGRESS,
          actualStartDate: new Date(),
        },
      });

    } catch (error) {
      this.logger.error(
        'Failed to activate scheduled maintenances',
        error?.stack || error,
      );
    }
  }

  // Run daily at 1 PM to send maintenance, warranty, and license reminders
  @Cron('0 13 * * *')
  async sendMaintenanceReminders() {
    try {
      await this.notificationService.createMaintenanceReminderNotifications();
      await this.notificationService.createWarrantyReminderNotifications();
      await this.notificationService.createLicenseReminderNotifications();
    } catch (error) {
      this.logger.error(
        'Failed to send daily reminder notifications',
        error?.stack || error,
      );
    }
  }
}

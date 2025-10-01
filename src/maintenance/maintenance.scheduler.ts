import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MaintenanceStatus } from '@prisma/client';

@Injectable()
export class MaintenanceScheduler {
  private readonly logger = new Logger(MaintenanceScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

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

      if (result.count > 0) {
        this.logger.log(`Activated ${result.count} maintenance schedule(s) to IN_PROGRESS`);
      }
    } catch (error) {
      this.logger.error('Failed to activate scheduled maintenances', error?.stack || error);
    }
  }
}

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MaintenanceService } from './maintenance.service';
import {
  MaintenanceController,
  MaintenanceTypesController,
} from './maintenance.controller';
import { PrismaModule } from '../../core/database/prisma.module';
import { MaintenanceScheduler } from './maintenance.scheduler';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot(), NotificationModule],
  controllers: [MaintenanceController, MaintenanceTypesController],
  providers: [MaintenanceService, MaintenanceScheduler],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}

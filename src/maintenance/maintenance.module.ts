import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceController, MaintenanceTypesController } from './maintenance.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MaintenanceScheduler } from './maintenance.scheduler';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [MaintenanceController, MaintenanceTypesController],
  providers: [MaintenanceService, MaintenanceScheduler],
  exports: [MaintenanceService],
})
export class MaintenanceModule {} 
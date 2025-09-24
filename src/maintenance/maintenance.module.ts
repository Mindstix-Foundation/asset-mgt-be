import { Module } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceController, MaintenanceTypesController } from './maintenance.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MaintenanceController, MaintenanceTypesController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {} 
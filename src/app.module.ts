import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TimezoneInterceptor } from './shared/timezone.interceptor';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GlobalAuthGuard } from './auth/guards/global-auth.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { AssetCategoriesModule } from './modules/asset-categories/asset-categories.module';
import { AssetTypesModule } from './modules/asset-types/asset-types.module';
import { BrandsModule } from './modules/brands/brands.module';
import { ModelsModule } from './modules/models/models.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { ReportsModule } from './reports/reports.module';
import { MaintenanceModule } from './maintenance/maintenance.module';

import { AssetsModule } from './modules/assets/assets.module';
import { AssetHistoryModule } from './modules/asset-history/asset-history.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    EmployeesModule,
    VendorsModule,
    AssetCategoriesModule,
    AssetTypesModule,
    BrandsModule,
    ModelsModule,
    AssignmentsModule,
    ReportsModule,
    MaintenanceModule,
    AssetsModule,
    AssetHistoryModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: GlobalAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimezoneInterceptor,
    },
  ],
})
export class AppModule {}


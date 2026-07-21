import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { TimezoneInterceptor } from './shared/timezone.interceptor';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GlobalAuthGuard } from './core/auth/guards/global-auth.guard';
import { PlatformAdminGuard } from './core/auth/guards/platform-admin.guard';
import { PrismaModule } from './core/database/prisma.module';
import { AuthModule } from './core/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { PlatformModule } from './modules/platform/platform.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { AssetCategoriesModule } from './modules/asset-categories/asset-categories.module';
import { AssetTypesModule } from './modules/asset-types/asset-types.module';
import { BrandsModule } from './modules/brands/brands.module';
import { DesignationsModule } from './modules/designations/designations.module';
import { ModelsModule } from './modules/models/models.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { AssetReportsModule } from './modules/asset-reports/asset-reports.module';
import { AssetsModule } from './modules/assets/assets.module';
import { AssetHistoryModule } from './modules/asset-history/asset-history.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    PrismaModule,
    AuthModule,
    EmployeesModule,
    VendorsModule,
    AssetCategoriesModule,
    AssetTypesModule,
    BrandsModule,
    DesignationsModule,
    ModelsModule,
    AssignmentsModule,
    AssetReportsModule,
    MaintenanceModule,
    AssetsModule,
    AssetHistoryModule,
    ReportsModule,
    AuditModule,
    AdminModule,
    PlatformModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: GlobalAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PlatformAdminGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimezoneInterceptor,
    },
  ],
})
export class AppModule {}

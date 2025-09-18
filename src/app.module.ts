import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { AssetCategoriesModule } from './modules/asset-categories/asset-categories.module';
import { BrandsModule } from './modules/brands/brands.module';
import { AssetTypesModule } from './modules/asset-types/asset-types.module';
import { ModelsModule } from './modules/models/models.module';
import { AssetsModule } from './modules/assets/assets.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { ReportsModule } from './modules/reports/reports.module';

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
    BrandsModule,
    AssetTypesModule,
    ModelsModule,
    AssetsModule,
    AssignmentsModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { AssetReportsService } from './asset-reports.service';
import { AssetReportsController } from './asset-reports.controller';
import { PrismaModule } from '../../core/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AssetReportsController],
  providers: [AssetReportsService],
  exports: [AssetReportsService],
})
export class AssetReportsModule {}

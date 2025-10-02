import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { AssetIdService } from './asset-id.service';
import { AssetAuditService } from './asset-audit.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AssetsController],
  providers: [AssetsService, AssetIdService, AssetAuditService],
  exports: [AssetsService, AssetIdService, AssetAuditService],
})
export class AssetsModule {} 
import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { PublicAssetsController } from './public-assets.controller';
import { AssetIdService } from './asset-id.service';
import { PrismaModule } from '../../core/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AssetsController, PublicAssetsController],
  providers: [AssetsService, AssetIdService],
  exports: [AssetsService, AssetIdService],
})
export class AssetsModule {}

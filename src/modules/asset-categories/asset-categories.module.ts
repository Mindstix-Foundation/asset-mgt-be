import { Module } from '@nestjs/common';
import { AssetCategoriesService } from './asset-categories.service';
import { AssetCategoriesController } from './asset-categories.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AssetCategoriesController],
  providers: [AssetCategoriesService],
  exports: [AssetCategoriesService],
})
export class AssetCategoriesModule {}

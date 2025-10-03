import { Module } from '@nestjs/common';
import { AssetHistoryController } from './asset-history.controller';
import { AssetHistoryService } from './asset-history.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AssetHistoryController],
  providers: [AssetHistoryService],
  exports: [AssetHistoryService],
})
export class AssetHistoryModule {}

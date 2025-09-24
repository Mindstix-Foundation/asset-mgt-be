import { Module } from '@nestjs/common';
import { AssetTypesService } from './asset-types.service';
import { AssetTypesController } from './asset-types.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AssetTypesController],
  providers: [AssetTypesService],
  exports: [AssetTypesService],
})
export class AssetTypesModule {}

import { Module } from '@nestjs/common';
import { SoftwareLicensesService } from './software-licenses.service';
import { SoftwareLicensesController } from './software-licenses.controller';
import { PrismaModule } from '../../core/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SoftwareLicensesController],
  providers: [SoftwareLicensesService],
  exports: [SoftwareLicensesService],
})
export class SoftwareLicensesModule {}

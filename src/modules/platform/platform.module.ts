import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { PlatformController } from './platform.controller';
import { PlatformRegistrationController } from './platform-registration.controller';
import { PlatformService } from './platform.service';

@Module({
  imports: [PrismaModule],
  controllers: [PlatformController, PlatformRegistrationController],
  providers: [PlatformService],
  exports: [PlatformService],
})
export class PlatformModule {}

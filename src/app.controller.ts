import { Controller, Get, Request } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './core/auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('dashboard/stats')
  async getDashboardStats(@Request() req: any) {
    const tenantId = req.user.tenantId as number;
    return await this.appService.getDashboardStats(tenantId);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import {
  CreateTenantDto,
  UpdateTenantDto,
  UpdateTenantStatusDto,
} from './dto/tenant.dto';
import { PlatformService } from './platform.service';

@ApiTags('Platform — Organization Management')
@ApiBearerAuth()
@Controller('platform/tenants')
@UseGuards(RolesGuard)
@Roles('SUPER_ADMIN')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get()
  @ApiOperation({
    summary: 'List organizations',
    description:
      'Platform super-admin only. Returns organization metadata and aggregate counts — never operational records.',
  })
  @ApiResponse({ status: 200, description: 'Organizations listed' })
  @ApiResponse({ status: 403, description: 'SUPER_ADMIN role required' })
  listTenants() {
    return this.platformService.listTenants();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization details (metadata only)' })
  getTenant(@Param('id', ParseIntPipe) id: number) {
    return this.platformService.getTenant(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Register / provision a new organization',
    description:
      'Creates a tenant and optionally provisions the first organization admin (B2B standard onboard).',
  })
  @ApiResponse({ status: 201, description: 'Organization created' })
  createTenant(@Body() dto: CreateTenantDto, @Request() req: any) {
    return this.platformService.createTenant(dto, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization name or access flag' })
  updateTenant(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.platformService.updateTenant(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Allow or revoke organization access to the platform',
  })
  updateTenantStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTenantStatusDto,
  ) {
    return this.platformService.updateTenantStatus(id, dto);
  }
}

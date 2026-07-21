import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { AuditService } from './audit.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated audit logs (admin only)' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  findAll(@Query() query: QueryAuditLogDto, @Request() req: any) {
    const tenantId = req.user.tenantId as number;
    return this.auditService.findAll(query, tenantId);
  }
}

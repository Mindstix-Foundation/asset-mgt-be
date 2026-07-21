import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { CreateAdminDto, UpdateAdminStatusDto } from './dto/admin.dto';

@ApiTags('Admin Management')
@Controller('admin')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all admin users' })
  @ApiResponse({
    status: 200,
    description: 'Admin users retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getAdminUsers(@Request() req: any) {
    const tenantId = req.user.tenantId as number;
    return this.adminService.getAdminUsers(tenantId);
  }

  @Post('users')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create new admin user' })
  @ApiResponse({ status: 201, description: 'Admin user created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async createAdminUser(
    @Body() createAdminDto: CreateAdminDto,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId as number;
    return this.adminService.createAdminUser(createAdminDto, req.user.id, tenantId);
  }

  @Patch('users/:id/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update admin user status' })
  @ApiResponse({
    status: 200,
    description: 'Admin status updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Admin user not found' })
  async updateAdminStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateAdminStatusDto,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId as number;
    return this.adminService.updateAdminStatus(
      Number.parseInt(id, 10),
      updateStatusDto,
      req.user.id,
      tenantId,
    );
  }

  @Delete('users/:id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove admin privileges' })
  @ApiResponse({
    status: 204,
    description: 'Admin privileges removed successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Admin user not found' })
  async removeAdminUser(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.user.tenantId as number;
    return this.adminService.removeAdminUser(
      Number.parseInt(id, 10),
      req.user.id,
      tenantId,
    );
  }
}

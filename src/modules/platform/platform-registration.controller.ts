import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrganizationRegistrationStatus } from '@prisma/client';
import { Public } from '../../core/auth/decorators/public.decorator';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import {
  RejectOrganizationRegistrationDto,
  SubmitOrganizationRegistrationDto,
} from './dto/registration.dto';
import { PlatformService } from './platform.service';

@ApiTags('Platform — Organization Registration')
@Controller('platform/registrations')
export class PlatformRegistrationController {
  constructor(private readonly platformService: PlatformService) {}

  @Public()
  @Post()
  @ApiOperation({
    summary: 'Submit organization registration (public)',
    description:
      'Self-service signup. Creates a PENDING request for platform SUPER_ADMIN approval.',
  })
  @ApiResponse({ status: 201, description: 'Registration submitted' })
  submit(@Body() dto: SubmitOrganizationRegistrationDto) {
    return this.platformService.submitRegistration(dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List organization registration requests' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: OrganizationRegistrationStatus,
  })
  list(@Query('status') status?: OrganizationRegistrationStatus) {
    return this.platformService.listRegistrations(status);
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Approve registration — creates org + first admin and grants access',
  })
  approve(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.platformService.approveRegistration(id, req.user.id);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject organization registration request' })
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectOrganizationRegistrationDto,
    @Request() req: any,
  ) {
    return this.platformService.rejectRegistration(id, req.user.id, dto);
  }
}

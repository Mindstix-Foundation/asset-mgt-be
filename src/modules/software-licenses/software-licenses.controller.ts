import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SoftwareLicensesService } from './software-licenses.service';
import {
  CreateSoftwareLicenseDto,
  UpdateSoftwareLicenseDto,
  SoftwareLicenseQueryDto,
} from './dto';

@ApiTags('software-licenses')
@ApiBearerAuth('JWT-auth')
@Controller('software-licenses')
export class SoftwareLicensesController {
  constructor(
    private readonly softwareLicensesService: SoftwareLicensesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a software license' })
  @ApiResponse({ status: 201, description: 'Created' })
  async create(
    @Body() dto: CreateSoftwareLicenseDto,
    @Request() req: any,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User authentication required');
    }
    return this.softwareLicensesService.create(
      dto,
      req.user.id,
      req.user.tenantId as number,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List software licenses' })
  async findAll(
    @Query() query: SoftwareLicenseQueryDto,
    @Request() req: any,
  ) {
    return this.softwareLicensesService.findAll(
      query,
      req.user.tenantId as number,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get software license by ID' })
  @ApiParam({ name: 'id' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.softwareLicensesService.findOne(
      id,
      req.user.tenantId as number,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update software license' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSoftwareLicenseDto,
    @Request() req: any,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User authentication required');
    }
    return this.softwareLicensesService.update(
      id,
      dto,
      req.user.id,
      req.user.tenantId as number,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete software license' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.softwareLicensesService.remove(
      id,
      req.user?.id ?? req.user?.userId,
      req.user.tenantId as number,
    );
  }
}

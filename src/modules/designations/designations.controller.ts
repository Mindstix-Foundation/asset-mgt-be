import {
  Controller,
  Get,
  Post,
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
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DesignationsService } from './designations.service';
import { CreateDesignationDto, DesignationQueryDto } from './dto';

@ApiTags('designations')
@ApiBearerAuth('JWT-auth')
@Controller('designations')
export class DesignationsController {
  constructor(private readonly designationsService: DesignationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new designation' })
  @ApiResponse({ status: 201, description: 'Designation created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation failed' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Designation name already exists',
  })
  async create(
    @Body() createDesignationDto: CreateDesignationDto,
    @Request() req: any,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException(
        'User authentication required. Please login to perform this action.',
      );
    }
    const userId = req.user.id;
    const tenantId = req.user.tenantId as number;
    return this.designationsService.create(
      createDesignationDto,
      userId,
      tenantId,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all designations with filtering and pagination',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  @ApiResponse({
    status: 200,
    description: 'Designations retrieved successfully',
  })
  async findAll(@Query() queryDto: DesignationQueryDto, @Request() req: any) {
    const tenantId = req.user.tenantId as number;
    return this.designationsService.findAll(queryDto, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get designation by ID' })
  @ApiParam({ name: 'id', description: 'Designation ID' })
  @ApiResponse({
    status: 200,
    description: 'Designation retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Designation not found' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const tenantId = req.user.tenantId as number;
    return this.designationsService.findOne(id, tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete designation by ID' })
  @ApiParam({ name: 'id', description: 'Designation ID' })
  @ApiResponse({ status: 200, description: 'Designation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Designation not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete designation assigned to employees',
  })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const tenantId = req.user.tenantId as number;
    return this.designationsService.remove(
      id,
      req.user?.id ?? req.user?.userId,
      tenantId,
    );
  }
}

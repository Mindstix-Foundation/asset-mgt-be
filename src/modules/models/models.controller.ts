import { Controller, Get, Post, Body, Param, Delete, Query, ParseIntPipe, HttpStatus, HttpCode, Request, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ModelsService } from './models.service';
import { CreateModelDto, ModelQueryDto } from './dto';

@ApiTags('models')
@ApiBearerAuth('JWT-auth')
@Controller('models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new model' })
  @ApiResponse({ status: 201, description: 'Model created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation failed or brand/asset type not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Model name already exists for this brand and asset type' })
  async create(@Body() createModelDto: CreateModelDto, @Request() req: any) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User authentication required. Please login to perform this action.');
    }
    const userId = req.user.id;
    return this.modelsService.create(createModelDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all models with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10, max: 100)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by model name' })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by brand ID' })
  @ApiQuery({ name: 'assetTypeId', required: false, description: 'Filter by asset type ID' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort by field (name, brandId, assetTypeId, createdAt, updatedAt)' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order (asc, desc)' })
  @ApiResponse({ status: 200, description: 'Models retrieved successfully' })
  async findAll(@Query() queryDto: ModelQueryDto) {
    return this.modelsService.findAll(queryDto);
  }



  @Get(':id')
  @ApiOperation({ summary: 'Get model by ID' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  @ApiResponse({ status: 200, description: 'Model retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.modelsService.findOne(id);
  }


  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete model by ID' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  @ApiResponse({ status: 200, description: 'Model deleted successfully' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete model with associated assets' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.modelsService.remove(id);
  }

} 
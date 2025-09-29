import { Controller, Get, Post, Body, Put, Param, Delete, Query, ParseIntPipe, HttpStatus, HttpCode, Request, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ModelsService } from './models.service';
import { CreateModelDto, UpdateModelDto, ModelQueryDto } from './dto';

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

  @Get('by-brand/:brandId')
  @ApiOperation({ summary: 'Get models by brand ID' })
  @ApiParam({ name: 'brandId', description: 'Brand ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Models retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            models: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                  specifications: { type: 'object' },
                  assetType: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      name: { type: 'string' },
                      category: {
                        type: 'object',
                        properties: {
                          id: { type: 'number' },
                          name: { type: 'string' }
                        }
                      }
                    }
                  },
                  _count: {
                    type: 'object',
                    properties: {
                      assets: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  })
  async findByBrand(@Param('brandId', ParseIntPipe) brandId: number) {
    return this.modelsService.findByBrand(brandId);
  }

  @Get('by-brand/:brandId/asset-type/:assetTypeId')
  @ApiOperation({ summary: 'Get models by brand and asset type' })
  @ApiParam({ name: 'brandId', description: 'Brand ID' })
  @ApiParam({ name: 'assetTypeId', description: 'Asset Type ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Models retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            models: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                  specifications: { type: 'object' },
                  brand: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      name: { type: 'string' }
                    }
                  },
                  assetType: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      name: { type: 'string' }
                    }
                  },
                  _count: {
                    type: 'object',
                    properties: {
                      assets: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  })
  async findByBrandAndAssetType(
    @Param('brandId', ParseIntPipe) brandId: number,
    @Param('assetTypeId', ParseIntPipe) assetTypeId: number
  ) {
    return this.modelsService.findByBrandAndAssetType(brandId, assetTypeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get model by ID' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  @ApiResponse({ status: 200, description: 'Model retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.modelsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update model by ID' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  @ApiResponse({ status: 200, description: 'Model updated successfully' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  @ApiResponse({ status: 400, description: 'Bad Request - Brand or asset type not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Model name already exists for this brand and asset type' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateModelDto: UpdateModelDto, @Request() req: any) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User authentication required. Please login to perform this action.');
    }
    const userId = req.user.id;
    return this.modelsService.update(id, updateModelDto, userId);
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

  @Post(':sourceId/merge/:targetId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Merge two models by transferring all references from source to target' })
  @ApiParam({ name: 'sourceId', description: 'Source model ID (will be deleted after merge)' })
  @ApiParam({ name: 'targetId', description: 'Target model ID (will receive all references)' })
  @ApiResponse({
    status: 200,
    description: 'Models merged successfully',
    schema: {
      example: {
        message: 'Models merged successfully',
        data: {
          mergeOperation: {
            sourceModel: 'iPhone 15 Pra',
            targetModel: 'iPhone 15 Pro',
            transferredAssets: 12
          }
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Source or target model not found' })
  @ApiResponse({ status: 400, description: 'Cannot merge model with itself or models from different brands/asset types' })
  async mergeModels(
    @Param('sourceId', ParseIntPipe) sourceId: number,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Request() req: any,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User authentication required. Please login to perform this action.');
    }
    const userId = req.user.id;
    return this.modelsService.mergeModels(sourceId, targetId, userId);
  }
} 
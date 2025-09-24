import { Controller, Get, Post, Body, Put, Param, Delete, Query, ParseIntPipe, HttpStatus, HttpCode, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AssetTypesService } from './asset-types.service';
import { CreateAssetTypeDto, UpdateAssetTypeDto, AssetTypeQueryDto } from './dto';

@ApiTags('asset-types')
@ApiBearerAuth('JWT-auth')
@Controller('asset-types')
export class AssetTypesController {
  constructor(private readonly assetTypesService: AssetTypesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new asset type' })
  async create(@Body() createAssetTypeDto: CreateAssetTypeDto, @Request() req: any) {
    const userId = req.user?.id || await this.assetTypesService.getOrCreateDefaultUser();
    return this.assetTypesService.create(createAssetTypeDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all asset types with filtering and pagination' })
  async findAll(@Query() queryDto: AssetTypeQueryDto) {
    return this.assetTypesService.findAll(queryDto);
  }

  @Get('by-category/:categoryId')
  @ApiOperation({ summary: 'Get active asset types by category ID' })
  @ApiParam({ name: 'categoryId', description: 'Asset Category ID' })
  async findByCategory(@Param('categoryId', ParseIntPipe) categoryId: number) {
    return this.assetTypesService.findByCategory(categoryId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset type by ID' })
  @ApiParam({ name: 'id', description: 'Asset Type ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.assetTypesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update asset type by ID' })
  @ApiParam({ name: 'id', description: 'Asset Type ID' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateAssetTypeDto: UpdateAssetTypeDto, @Request() req: any) {
    const userId = req.user?.id || await this.assetTypesService.getOrCreateDefaultUser();
    return this.assetTypesService.update(id, updateAssetTypeDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete asset type by ID' })
  @ApiParam({ name: 'id', description: 'Asset Type ID' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.assetTypesService.remove(id);
  }
} 
import { Controller, Get, Post, Body, Put, Param, Delete, Query, ParseIntPipe, HttpStatus, HttpCode, Request, UseInterceptors, UploadedFile, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AssetsService } from './assets.service';
import { AssetIdService } from './asset-id.service';
import { CreateAssetDto, UpdateAssetDto, AssetQueryDto } from './dto';

@ApiTags('assets')
@ApiBearerAuth('JWT-auth')
@Controller('assets')
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly assetIdService: AssetIdService
  ) {}

  @Get('generate-id')
  @ApiOperation({ summary: 'Generate next sequential asset ID' })
  @ApiResponse({ status: 200, description: 'Next asset ID generated successfully' })
  async generateAssetId() {
    const assetId = await this.assetIdService.generateNextAssetId();
    return {
      message: 'Asset ID generated successfully',
      data: { assetId }
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new asset' })
  @ApiResponse({ status: 201, description: 'Asset created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation failed or related entity not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Asset ID or serial number already exists' })
  async create(@Body() createAssetDto: CreateAssetDto, @Request() req: any) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User authentication required. Please login to create assets.');
    }
    const userId = req.user.id;
    return this.assetsService.create(createAssetDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all assets with comprehensive filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10, max: 100)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by asset ID, serial number, or notes' })
  @ApiQuery({ name: 'assetTypeId', required: false, description: 'Filter by asset type ID' })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by brand ID' })
  @ApiQuery({ name: 'modelId', required: false, description: 'Filter by model ID' })
  @ApiQuery({ name: 'vendorId', required: false, description: 'Filter by vendor ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (AVAILABLE, ASSIGNED, IN_MAINTENANCE, RETIRED, LOST)' })
  @ApiQuery({ name: 'condition', required: false, description: 'Filter by condition (NEW, GOOD, FAIR, POOR, DAMAGED)' })
  @ApiQuery({ name: 'location', required: false, description: 'Filter by location' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort by field (assetId, status, condition, purchaseDate, createdAt, updatedAt)' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order (asc, desc)' })
  @ApiResponse({ status: 200, description: 'Assets retrieved successfully' })
  async findAll(@Query() queryDto: AssetQueryDto) {
    return this.assetsService.findAll(queryDto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get asset statistics for dashboard' })
  @ApiResponse({ 
    status: 200, 
    description: 'Asset statistics retrieved successfully',
    schema: {
      example: {
        message: 'Asset statistics retrieved successfully',
        data: {
          totalAssets: 1234,
          available: 856,
          assigned: 342,
          inMaintenance: 36,
          retired: 0,
          lost: 0
        }
      }
    }
  })
  async getAssetStats() {
    return this.assetsService.getAssetStats();
  }

  @Get('search')
  @ApiOperation({ summary: 'Advanced search functionality for assets' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query across all asset fields' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10, max: 100)' })
  @ApiQuery({ name: 'assetTypeId', required: false, description: 'Filter by asset type ID' })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by brand ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'condition', required: false, description: 'Filter by condition' })
  @ApiResponse({ 
    status: 200, 
    description: 'Search results retrieved successfully',
    schema: {
      example: {
        message: 'Search results retrieved successfully',
        data: {
          searchResults: [
            {
              id: 1,
              assetId: 'AST001',
              serialNumber: 'SN123456789',
              assetType: {
                id: 1,
                name: 'Laptop',
                category: { id: 1, name: 'Electronics' }
              },
              brand: { id: 1, name: 'Apple' },
              model: { id: 1, name: 'MacBook Pro 16"' },
              condition: 'GOOD',
              status: 'AVAILABLE',
              location: 'Office Floor 3',
              notes: 'High-performance laptop for development work'
            }
          ],
          searchQuery: 'laptop',
          totalFound: 1,
          pagination: {
            totalCount: 1,
            currentPage: 1,
            totalPages: 1,
            hasNext: false,
            hasPrevious: false
          }
        }
      }
    }
  })
  async searchAssets(@Query() queryDto: any) {
    return this.assetsService.searchAssets(queryDto);
  }

  @Get('dropdowns')
  @ApiOperation({ summary: 'Get all available assets for dropdown selection (ID and basic info only)' })
  @ApiQuery({ name: 'status', required: false, enum: ['AVAILABLE', 'ASSIGNED', 'IN_MAINTENANCE', 'RETIRED', 'LOST'], description: 'Filter by status (default: AVAILABLE)', example: 'AVAILABLE' })
  @ApiQuery({ name: 'assetTypeId', required: false, description: 'Filter by asset type ID' })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by brand ID' })
  @ApiQuery({ name: 'modelId', required: false, description: 'Filter by model ID' })
  @ApiResponse({
    status: 200,
    description: 'Assets retrieved successfully for dropdown',
    schema: {
      example: {
        message: 'Assets retrieved successfully',
        data: {
          assets: [
            {
              id: 'uuid-here',
              assetId: 'AST001',
              serialNumber: 'SN123456789',
              assetType: { id: 1, name: 'Laptop' },
              brand: { id: 1, name: 'Apple' },
              model: { id: 1, name: 'MacBook Pro 16"' },
              condition: 'GOOD',
              status: 'AVAILABLE',
              location: 'Office Floor 3'
            }
          ]
        }
      }
    }
  })
  async getAssetsForDropdowns(@Query() query: any) {
    return this.assetsService.getAssetsForDropdowns(query);
  }

  @Get('available')
  @ApiOperation({ summary: 'Get all available assets (for issue asset page)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10, max: 100)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by asset ID, serial number, or notes' })
  @ApiQuery({ name: 'assetTypeId', required: false, description: 'Filter by asset type ID' })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by brand ID' })
  @ApiQuery({ name: 'modelId', required: false, description: 'Filter by model ID' })
  @ApiQuery({ name: 'condition', required: false, description: 'Filter by condition (NEW, GOOD, FAIR, POOR, DAMAGED)' })
  @ApiQuery({ name: 'location', required: false, description: 'Filter by location' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort by field (assetId, condition, createdAt, updatedAt)' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order (asc, desc)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Available assets retrieved successfully',
    schema: {
      example: {
        message: 'Available assets retrieved successfully',
        data: {
          assets: [
            {
              id: 1,
              assetId: 'AST001',
              assetType: {
                id: 1,
                name: 'Laptop',
                category: { id: 1, name: 'Electronics' }
              },
              brand: { id: 1, name: 'Apple' },
              model: { 
                id: 1, 
                name: 'MacBook Pro 16"',
                specifications: {
                  processor: 'Apple M2 Pro',
                  ram: '16GB',
                  storage: '512GB SSD'
                }
              },
              condition: 'GOOD',
              status: 'AVAILABLE',
              location: 'Office Floor 3',
              vendor: { id: 1, name: 'Apple Store' }
            }
          ],
          pagination: {
            totalCount: 1,
            currentPage: 1,
            totalPages: 1,
            hasNext: false,
            hasPrevious: false
          }
        }
      }
    }
  })
  async findAvailableAssets(@Query() queryDto: AssetQueryDto) {
    return this.assetsService.findAvailableAssets(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset by ID with complete details' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiResponse({ status: 200, description: 'Asset retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.assetsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update asset by ID' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiResponse({ status: 200, description: 'Asset updated successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({ status: 400, description: 'Bad Request - Related entity not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Asset ID or serial number already exists' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateAssetDto: UpdateAssetDto, @Request() req: any) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User authentication required. Please login to update assets.');
    }
    const userId = req.user.id;
    return this.assetsService.update(id, updateAssetDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete asset by ID' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiResponse({ status: 200, description: 'Asset deleted successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete asset with active assignments or maintenance schedules' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.assetsService.remove(id);
  }

  @Post('bulk-upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Bulk upload assets from CSV/Excel file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload with optional validation',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV or Excel file containing asset data'
        },
        validate_only: {
          type: 'string',
          enum: ['true', 'false'],
          description: 'Set to "true" to only validate without importing',
          example: 'false'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Assets uploaded successfully',
    schema: {
      example: {
        message: 'Assets uploaded successfully',
        data: {
          imported: 95,
          errors: [
            {
              row: 5,
              field: 'assetId',
              message: 'Asset ID already exists'
            },
            {
              row: 12,
              field: 'serialNumber',
              message: 'Invalid serial number format'
            }
          ],
          summary: {
            totalRows: 100,
            successfulImports: 95,
            failedImports: 5,
            validationErrors: 5
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid file format or validation errors' })
  @ApiResponse({ status: 413, description: 'File size too large (max 10MB)' })
  async bulkUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body('validate_only') validateOnly: string,
    @Request() req: any,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User authentication required. Please login to upload assets.');
    }
    const userId = req.user.id;
    const isValidateOnly = validateOnly === 'true';
    return this.assetsService.bulkUpload(file, userId, isValidateOnly);
  }
} 
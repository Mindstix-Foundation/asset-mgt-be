import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
  Request,
  UseInterceptors,
  UploadedFile,
  UnauthorizedException,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AssetsService } from './assets.service';
import { AssetIdService } from './asset-id.service';
import {
  CreateAssetDto,
  UpdateAssetDto,
  AssetQueryDto,
  RetireAssetDto,
  ReactivateAssetDto,
  BulkDeleteAssetDto,
} from './dto';

@ApiTags('assets')
@ApiBearerAuth('JWT-auth')
@Controller('assets')
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly assetIdService: AssetIdService,
  ) {}

  @Get('generate-id')
  @ApiOperation({ summary: 'Generate next sequential asset ID' })
  @ApiResponse({
    status: 200,
    description: 'Next asset ID generated successfully',
  })
  async generateAssetId() {
    const assetId = await this.assetIdService.generateNextAssetId();
    return {
      message: 'Asset ID generated successfully',
      data: { assetId },
    };
  }

  @Get('check-serial-unique')
  @ApiOperation({ summary: 'Check if serial number is unique' })
  @ApiQuery({
    name: 'serialNumber',
    required: true,
    description: 'Serial number to check',
  })
  @ApiQuery({
    name: 'excludeAssetId',
    required: false,
    description: 'Asset ID to exclude from check (for edit mode)',
  })
  @ApiResponse({
    status: 200,
    description: 'Serial number uniqueness check completed',
    schema: {
      example: {
        message: 'Serial number check completed',
        data: {
          isUnique: true,
          serialNumber: 'SN123456789',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Serial number is required',
  })
  async checkSerialNumberUnique(
    @Query('serialNumber') serialNumber: string,
    @Query('excludeAssetId') excludeAssetId?: string,
  ) {
    return this.assetsService.checkSerialNumberUnique(
      serialNumber,
      excludeAssetId,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new asset' })
  @ApiResponse({ status: 201, description: 'Asset created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Validation failed or related entity not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Asset ID or serial number already exists',
  })
  async create(@Body() createAssetDto: CreateAssetDto, @Request() req: any) {
    if (!req.user?.id) {
      throw new UnauthorizedException(
        'User authentication required. Please login to create assets.',
      );
    }
    const userId = req.user.id;
    return this.assetsService.create(createAssetDto, userId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all assets with comprehensive filtering and pagination',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10, max: 100)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by asset ID, serial number, or notes',
  })
  @ApiQuery({
    name: 'assetTypeId',
    required: false,
    description: 'Filter by asset type ID',
  })
  @ApiQuery({
    name: 'brandId',
    required: false,
    description: 'Filter by brand ID',
  })
  @ApiQuery({
    name: 'modelId',
    required: false,
    description: 'Filter by model ID',
  })
  @ApiQuery({
    name: 'vendorId',
    required: false,
    description: 'Filter by vendor ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description:
      'Filter by status (AVAILABLE, ASSIGNED, IN_MAINTENANCE, RETIRED, LOST)',
  })
  @ApiQuery({
    name: 'condition',
    required: false,
    description: 'Filter by condition (NEW, GOOD, FAIR, POOR, DAMAGED)',
  })
  @ApiQuery({
    name: 'location',
    required: false,
    description: 'Filter by location',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description:
      'Sort by field (assetId, status, condition, purchaseDate, createdAt, updatedAt)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (asc, desc)',
  })
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
          lost: 0,
        },
      },
    },
  })
  async getAssetStats() {
    return this.assetsService.getAssetStats();
  }

  @Get('unique-specifications')
  @ApiOperation({
    summary: 'Get unique specification combinations for filtering',
  })
  @ApiQuery({
    name: 'assetTypeId',
    required: true,
    description: 'Asset Type ID to filter by',
  })
  @ApiQuery({
    name: 'brandId',
    required: true,
    description: 'Brand ID to filter by',
  })
  @ApiResponse({
    status: 200,
    description: 'Unique specification combinations retrieved successfully',
    schema: {
      example: {
        message: 'Unique specifications retrieved successfully',
        data: {
          requiredSpecs: ['size', 'panel'],
          combinations: [
            { size: '21.5"', panel: 'IPS' },
            { size: '21.5"', panel: 'OLED' },
            { size: '32"', panel: 'IPS' },
          ],
        },
      },
    },
  })
  async getUniqueSpecifications(
    @Query('assetTypeId') assetTypeId: string,
    @Query('brandId') brandId: string,
  ) {
    return this.assetsService.getUniqueSpecifications(
      Number.parseInt(assetTypeId),
      Number.parseInt(brandId),
    );
  }

  @Get('specification-values')
  @ApiOperation({
    summary: 'Get distinct specification values for autocomplete filtering',
  })
  @ApiQuery({
    name: 'assetTypeId',
    required: true,
    description: 'Asset Type ID to scope the search',
  })
  @ApiQuery({
    name: 'key',
    required: true,
    description: 'Specification field key (e.g. "macAddress")',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Partial text to match against specification values',
  })
  @ApiResponse({
    status: 200,
    description: 'Distinct specification values retrieved successfully',
    schema: {
      example: {
        message: 'Specification values retrieved successfully',
        data: {
          values: ['54:E1:AD:61:BC:90', '54:E1:AD:62:AA:11'],
        },
      },
    },
  })
  async getSpecificationValues(
    @Query('assetTypeId') assetTypeId: string,
    @Query('key') key: string,
    @Query('search') search?: string,
  ) {
    return this.assetsService.getSpecificationValues(
      Number.parseInt(assetTypeId),
      key,
      search,
    );
  }

  @Get('export')
  @ApiOperation({
    summary: 'Export assets to Excel file with filtering support',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by asset ID, serial number, or notes',
  })
  @ApiQuery({
    name: 'assetTypeId',
    required: false,
    description: 'Filter by asset type ID',
  })
  @ApiQuery({
    name: 'brandId',
    required: false,
    description: 'Filter by brand ID',
  })
  @ApiQuery({
    name: 'modelId',
    required: false,
    description: 'Filter by model ID',
  })
  @ApiQuery({
    name: 'vendorId',
    required: false,
    description: 'Filter by vendor ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description:
      'Filter by status (AVAILABLE, ASSIGNED, IN_MAINTENANCE, RETIRED, LOST)',
  })
  @ApiQuery({
    name: 'condition',
    required: false,
    description:
      'Filter by condition (NEW, GOOD, FAIR, POOR, DAMAGED, REFURBISHED)',
  })
  @ApiQuery({
    name: 'location',
    required: false,
    description: 'Filter by location',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description:
      'Sort by field (assetId, status, condition, purchaseDate, createdAt, updatedAt)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (asc, desc)',
  })
  @ApiResponse({
    status: 200,
    description: 'Excel file download',
    headers: {
      'Content-Type': {
        description:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        schema: { type: 'string' },
      },
      'Content-Disposition': {
        description: 'attachment; filename="assets_export_YYYY-MM-DD.xlsx"',
        schema: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid query parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - User authentication required',
  })
  async exportAssets(
    @Query() queryDto: AssetQueryDto,
    @Res() res: Response,
    @Request() req: any,
  ) {
    if (!req.user?.id) {
      return res.status(401).json({
        message: 'User authentication required. Please login to export assets.',
        statusCode: 401,
      });
    }

    try {
      const result = await this.assetsService.exportAssets(queryDto);

      // Set response headers for file download
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${result.data.filename}"`,
      );
      res.setHeader('Content-Length', result.data.buffer.length);

      // Send the Excel file buffer
      res.send(result.data.buffer);
    } catch (error) {
      res.status(400).json({
        message: 'Export failed',
        error: error.message,
      });
    }
  }

  @Get('search')
  @ApiOperation({ summary: 'Advanced search functionality for assets' })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Search query across all asset fields',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10, max: 100)',
  })
  @ApiQuery({
    name: 'assetTypeId',
    required: false,
    description: 'Filter by asset type ID',
  })
  @ApiQuery({
    name: 'brandId',
    required: false,
    description: 'Filter by brand ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'condition',
    required: false,
    description: 'Filter by condition',
  })
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
                category: { id: 1, name: 'Electronics' },
              },
              brand: { id: 1, name: 'Apple' },
              model: { id: 1, name: 'MacBook Pro 16"' },
              condition: 'WORKING_CONDITION',
              status: 'NON_ASSIGNED',
              location: 'Office Floor 3',
              notes: 'High-performance laptop for development work',
            },
          ],
          searchQuery: 'laptop',
          totalFound: 1,
          pagination: {
            totalCount: 1,
            currentPage: 1,
            totalPages: 1,
            hasNext: false,
            hasPrevious: false,
          },
        },
      },
    },
  })
  async searchAssets(@Query() queryDto: any) {
    return this.assetsService.searchAssets(queryDto);
  }

  @Get('dropdowns')
  @ApiOperation({
    summary:
      'Get all non-assigned assets for dropdown selection (ID and basic info only)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'NON_ASSIGNED',
      'ASSIGNED',
      'IN_MAINTENANCE',
      'RETIRED',
      'LOST',
      'DONATED',
    ],
    description: 'Filter by status (default: NON_ASSIGNED)',
    example: 'NON_ASSIGNED',
  })
  @ApiQuery({
    name: 'assetTypeId',
    required: false,
    description: 'Filter by asset type ID',
  })
  @ApiQuery({
    name: 'brandId',
    required: false,
    description: 'Filter by brand ID',
  })
  @ApiQuery({
    name: 'modelId',
    required: false,
    description: 'Filter by model ID',
  })
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
              condition: 'WORKING_CONDITION',
              status: 'NON_ASSIGNED',
              location: 'Office Floor 3',
            },
          ],
        },
      },
    },
  })
  async getAssetsForDropdowns(@Query() query: any) {
    return this.assetsService.getAssetsForDropdowns(query);
  }

  @Get('available')
  @ApiOperation({ summary: 'Get all available assets (for issue asset page)' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10, max: 100)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by asset ID, serial number, or notes',
  })
  @ApiQuery({
    name: 'assetTypeId',
    required: false,
    description: 'Filter by asset type ID',
  })
  @ApiQuery({
    name: 'brandId',
    required: false,
    description: 'Filter by brand ID',
  })
  @ApiQuery({
    name: 'modelId',
    required: false,
    description: 'Filter by model ID',
  })
  @ApiQuery({
    name: 'condition',
    required: false,
    description: 'Filter by condition (NEW, GOOD, FAIR, POOR, DAMAGED)',
  })
  @ApiQuery({
    name: 'location',
    required: false,
    description: 'Filter by location',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort by field (assetId, condition, createdAt, updatedAt)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (asc, desc)',
  })
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
                category: { id: 1, name: 'Electronics' },
              },
              brand: { id: 1, name: 'Apple' },
              model: {
                id: 1,
                name: 'MacBook Pro 16"',
                specifications: {
                  processor: 'Apple M2 Pro',
                  ram: '16GB',
                  storage: '512GB SSD',
                },
              },
              condition: 'WORKING_CONDITION',
              status: 'NON_ASSIGNED',
              location: 'Office Floor 3',
              vendor: { id: 1, name: 'Apple Store' },
            },
          ],
          pagination: {
            totalCount: 1,
            currentPage: 1,
            totalPages: 1,
            hasNext: false,
            hasPrevious: false,
          },
        },
      },
    },
  })
  async findAvailableAssets(@Query() queryDto: AssetQueryDto) {
    return this.assetsService.findAvailableAssets(queryDto);
  }

  @Get('deletable')
  @ApiOperation({
    summary:
      'Get assets that can be deleted (AVAILABLE status, no assignment history, no maintenance history)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10, max: 100)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by asset ID, serial number, or notes',
  })
  @ApiQuery({
    name: 'assetTypeId',
    required: false,
    description: 'Filter by asset type ID',
  })
  @ApiQuery({
    name: 'brandId',
    required: false,
    description: 'Filter by brand ID',
  })
  @ApiQuery({
    name: 'modelId',
    required: false,
    description: 'Filter by model ID',
  })
  @ApiQuery({
    name: 'vendorId',
    required: false,
    description: 'Filter by vendor ID',
  })
  @ApiQuery({
    name: 'condition',
    required: false,
    description: 'Filter by condition (NEW, GOOD, FAIR, POOR, DAMAGED)',
  })
  @ApiQuery({
    name: 'location',
    required: false,
    description: 'Filter by location',
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    description: 'Filter assets created on/after this date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'toDate',
    required: false,
    description: 'Filter assets created on/before this date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description:
      'Sort by field (assetId, status, condition, purchaseDate, createdAt, updatedAt)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (asc, desc)',
  })
  @ApiResponse({
    status: 200,
    description: 'Deletable assets retrieved successfully',
  })
  async findDeletableAssets(@Query() queryDto: AssetQueryDto) {
    return this.assetsService.findDeletableAssets(queryDto);
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
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Related entity not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Asset ID or serial number already exists',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAssetDto: UpdateAssetDto,
    @Request() req: any,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException(
        'User authentication required. Please login to update assets.',
      );
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
  @ApiResponse({
    status: 400,
    description:
      'Cannot delete asset with active assignments or maintenance schedules',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.assetsService.remove(id);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete multiple assets at once' })
  @ApiResponse({
    status: 200,
    description: 'Bulk delete completed',
    schema: {
      example: {
        message: 'Bulk delete completed: 3 succeeded, 2 failed',
        data: {
          successCount: 3,
          errorCount: 2,
          totalProcessed: 5,
          results: [
            {
              id: 1,
              assetId: 'AST-0001',
              status: 'success',
              message: 'Asset deleted successfully',
            },
            {
              id: 2,
              assetId: 'AST-0002',
              status: 'error',
              message: 'Cannot delete asset with status ASSIGNED',
            },
            {
              id: 3,
              assetId: 'AST-0003',
              status: 'success',
              message: 'Asset deleted successfully',
            },
            {
              id: 4,
              assetId: 'AST-0004',
              status: 'error',
              message: 'Asset has been assigned',
            },
            {
              id: 5,
              assetId: 'AST-0005',
              status: 'success',
              message: 'Asset deleted successfully',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request - at least one asset ID is required',
  })
  async bulkDelete(@Body() bulkDeleteDto: BulkDeleteAssetDto) {
    return this.assetsService.bulkDelete(bulkDeleteDto.assetIds);
  }

  @Put(':id/retire')
  @ApiOperation({ summary: 'Retire an asset with retirement details' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiResponse({
    status: 200,
    description: 'Asset retired successfully',
    schema: {
      example: {
        message: 'Asset retired successfully',
        data: {
          asset: {
            id: 1,
            assetId: 'AST-0001',
            status: 'RETIRED',
            retirementDate: '2024-12-31T00:00:00.000Z',
            retirementReason: 'END_OF_LIFE',
            assetType: 'Laptop',
            brand: 'Apple',
            model: 'MacBook Pro 16"',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Asset cannot be retired (already retired, assigned, or in maintenance)',
  })
  async retireAsset(
    @Param('id', ParseIntPipe) id: number,
    @Body() retireAssetDto: RetireAssetDto,
    @Request() req: any,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException(
        'User authentication required. Please login to retire assets.',
      );
    }
    const userId = req.user.id;
    return this.assetsService.retireAsset(id, retireAssetDto, userId);
  }

  @Put(':id/reactivate')
  @ApiOperation({ summary: 'Reactivate a retired asset' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiResponse({
    status: 200,
    description: 'Asset reactivated successfully',
    schema: {
      example: {
        message: 'Asset reactivated successfully',
        data: {
          asset: {
            id: 1,
            assetId: 'AST-0001',
            status: 'NON_ASSIGNED',
            condition: 'WORKING_CONDITION',
            location: 'Warehouse A, Shelf B2',
            reactivationDate: '2024-12-31T00:00:00.000Z',
            reactivationReason: 'Asset repaired and ready for use',
            assetType: 'Laptop',
            brand: 'Apple',
            model: 'MacBook Pro 16"',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Only retired assets can be reactivated',
  })
  async reactivateAsset(
    @Param('id', ParseIntPipe) id: number,
    @Body() reactivateAssetDto: ReactivateAssetDto,
    @Request() req: any,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException(
        'User authentication required. Please login to reactivate assets.',
      );
    }
    const userId = req.user.id;
    return this.assetsService.reactivateAsset(id, reactivateAssetDto, userId);
  }

  @Post('validate-bulk-upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Validate bulk upload data without importing' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload for validation only',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV or Excel file containing asset data',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'File validation completed',
    schema: {
      example: {
        message: 'File validation completed',
        data: {
          totalRows: 100,
          validRows: 95,
          invalidRows: 5,
          errors: [
            {
              row: 5,
              field: 'assetId',
              message: 'Asset ID already exists in database',
              value: 'AST-0001',
            },
            {
              row: 12,
              field: 'serialNumber',
              message: 'Serial number already exists in database',
              value: 'SN123456789',
            },
            {
              row: 15,
              field: 'assetId',
              message: 'Invalid asset ID format. Expected format: AST-XXXX',
              value: 'AST-123',
            },
            {
              row: 20,
              field: 'modelId',
              message:
                'Model ID 5 does not belong to Asset Type ID 1. Valid models for Asset Type 1: None',
              value: '5',
            },
          ],
          validationOnly: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file format or validation errors',
  })
  @ApiResponse({ status: 413, description: 'File size too large (max 10MB)' })
  async validateBulkUpload(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException(
        'User authentication required. Please login to validate assets.',
      );
    }
    const userId = req.user.id;
    return this.assetsService.validateBulkUpload(file, userId);
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
          description: 'CSV or Excel file containing asset data',
        },
        validate_only: {
          type: 'string',
          enum: ['true', 'false'],
          description: 'Set to "true" to only validate without importing',
          example: 'false',
        },
      },
    },
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
              message: 'Asset ID already exists',
            },
            {
              row: 12,
              field: 'serialNumber',
              message: 'Invalid serial number format',
            },
          ],
          summary: {
            totalRows: 100,
            successfulImports: 95,
            failedImports: 5,
            validationErrors: 5,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file format or validation errors',
  })
  @ApiResponse({ status: 413, description: 'File size too large (max 10MB)' })
  async bulkUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body('validate_only') validateOnly: string,
    @Request() req: any,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException(
        'User authentication required. Please login to upload assets.',
      );
    }
    const userId = req.user.id;
    const isValidateOnly = validateOnly === 'true';
    return this.assetsService.bulkUpload(file, userId, isValidateOnly);
  }
}

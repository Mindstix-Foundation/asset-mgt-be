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
import { AssetCategoriesService } from './asset-categories.service';
import { CreateAssetCategoryDto, AssetCategoryQueryDto } from './dto';

@ApiTags('asset-categories')
@ApiBearerAuth('JWT-auth')
@Controller('asset-categories')
export class AssetCategoriesController {
  constructor(
    private readonly assetCategoriesService: AssetCategoriesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new asset category' })
  @ApiResponse({
    status: 201,
    description: 'Asset category created successfully',
    schema: {
      example: {
        message: 'Asset category created successfully',
        data: {
          assetCategory: {
            id: 1,
            name: 'Electronics',
            description: 'Electronic devices and equipment',
            createdAt: '2024-01-15T10:30:00Z',
            updatedAt: '2024-01-15T10:30:00Z',
            createdByUser: {
              id: 1,
              username: 'admin',
            },
            _count: {
              assetTypes: 0,
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation failed' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Category name already exists',
  })
  async create(
    @Body() createAssetCategoryDto: CreateAssetCategoryDto,
    @Request() req: any,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException(
        'User authentication required. Please login to perform this action.',
      );
    }
    const userId = req.user.id;
    return this.assetCategoriesService.create(createAssetCategoryDto, userId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all asset categories with filtering and pagination',
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
    description: 'Search by name or description',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort by field (name, createdAt, updatedAt)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (asc, desc)',
  })
  @ApiResponse({
    status: 200,
    description: 'Asset categories retrieved successfully',
    schema: {
      example: {
        message: 'Asset categories retrieved successfully',
        data: {
          assetCategories: [
            {
              id: 1,
              name: 'Electronics',
              description: 'Electronic devices and equipment',
              createdAt: '2024-01-15T10:30:00Z',
              createdByUser: {
                id: 1,
                username: 'admin',
              },
              _count: {
                assetTypes: 5,
              },
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
  async findAll(@Query() queryDto: AssetCategoryQueryDto) {
    return this.assetCategoriesService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset category by ID' })
  @ApiParam({ name: 'id', description: 'Asset Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Asset category retrieved successfully',
    schema: {
      example: {
        message: 'Asset category retrieved successfully',
        data: {
          assetCategory: {
            id: 1,
            name: 'Electronics',
            description: 'Electronic devices and equipment',
            createdAt: '2024-01-15T10:30:00Z',
            updatedAt: '2024-01-15T10:30:00Z',
            createdByUser: {
              id: 1,
              username: 'admin',
            },
            updatedByUser: {
              id: 1,
              username: 'admin',
            },
            assetTypes: [
              {
                id: 1,
                name: 'Laptop',
                isActive: true,
                _count: {
                  assets: 10,
                },
              },
            ],
            _count: {
              assetTypes: 5,
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Asset category not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.assetCategoriesService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete asset category by ID' })
  @ApiParam({ name: 'id', description: 'Asset Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Asset category deleted successfully',
    schema: {
      example: {
        message: 'Asset category deleted successfully',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Asset category not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete category with associated asset types',
  })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.assetCategoriesService.remove(id, req.user?.id ?? req.user?.userId);
  }
}

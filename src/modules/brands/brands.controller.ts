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
import { BrandsService } from './brands.service';
import { CreateBrandDto, BrandQueryDto } from './dto';

@ApiTags('brands')
@ApiBearerAuth('JWT-auth')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new brand' })
  @ApiResponse({
    status: 201,
    description: 'Brand created successfully',
    schema: {
      example: {
        message: 'Brand created successfully',
        data: {
          brand: {
            id: 1,
            name: 'Apple',
            description: 'Premium technology brand',
            createdAt: '2024-01-15T10:30:00Z',
            updatedAt: '2024-01-15T10:30:00Z',
            createdByUser: {
              id: 1,
              name: 'System Administrator',
            },
            _count: {
              models: 0,
              assets: 0,
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation failed' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Brand name already exists',
  })
  async create(@Body() createBrandDto: CreateBrandDto, @Request() req: any) {
    if (!req.user?.id) {
      throw new UnauthorizedException(
        'User authentication required. Please login to perform this action.',
      );
    }
    const userId = req.user.id;
    return this.brandsService.create(createBrandDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all brands with filtering and pagination' })
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
    description: 'Brands retrieved successfully',
    schema: {
      example: {
        message: 'Brands retrieved successfully',
        data: {
          brands: [
            {
              id: 1,
              name: 'Apple',
              description: 'Premium technology brand',
              createdAt: '2024-01-15T10:30:00Z',
              createdByUser: {
                id: 1,
                name: 'System Administrator',
              },
              _count: {
                models: 5,
                assets: 25,
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
  async findAll(@Query() queryDto: BrandQueryDto) {
    return this.brandsService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get brand by ID' })
  @ApiParam({ name: 'id', description: 'Brand ID' })
  @ApiResponse({
    status: 200,
    description: 'Brand retrieved successfully',
    schema: {
      example: {
        message: 'Brand retrieved successfully',
        data: {
          brand: {
            id: 1,
            name: 'Apple',
            description: 'Premium technology brand',
            createdAt: '2024-01-15T10:30:00Z',
            updatedAt: '2024-01-15T10:30:00Z',
            createdByUser: {
              id: 1,
              name: 'System Administrator',
            },
            updatedByUser: {
              id: 1,
              name: 'System Administrator',
            },
            models: [
              {
                id: 1,
                name: 'MacBook Pro 16"',
                assetType: {
                  id: 1,
                  name: 'Laptop',
                },
                _count: {
                  assets: 10,
                },
              },
            ],
            assets: [
              {
                id: 1,
                assetId: 'AST001',
                status: 'NON_ASSIGNED',
                condition: 'WORKING_CONDITION',
              },
            ],
            _count: {
              models: 5,
              assets: 25,
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.brandsService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete brand by ID' })
  @ApiParam({ name: 'id', description: 'Brand ID' })
  @ApiResponse({
    status: 200,
    description: 'Brand deleted successfully',
    schema: {
      example: {
        message: 'Brand deleted successfully',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete brand with associated models or assets',
  })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.brandsService.remove(id, req.user?.id ?? req.user?.userId);
  }
}

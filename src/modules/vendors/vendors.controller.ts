import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
  Put,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  CreateVendorDto,
  UpdateVendorDto,
  VendorQueryDto,
  VendorSearchDto,
  VendorStatusDto,
  CheckVendorNameDto,
  VendorNameCheckResponseDto,
} from './dto';

@ApiTags('vendors')
@ApiBearerAuth('JWT-auth')
@Controller('vendors')
@UseGuards(JwtAuthGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new vendor' })
  @ApiResponse({
    status: 201,
    description: 'Vendor created successfully',
    schema: {
      example: {
        message: 'Vendor created successfully',
        data: {
          vendor: {
            id: 1,
            name: 'Apple Store',
            vendorType: 'SUPPLIER',
            contactPerson: 'John Smith',
            email: 'contact@apple.com',
            phone: '+1-800-275-2273',
            status: 'ACTIVE',
            createdAt: '2024-01-15T10:30:00Z',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation failed' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Vendor name or email already exists',
  })
  async create(@Body() createVendorDto: CreateVendorDto, @Request() req: any) {
    // For now, we'll create a default user if none exists
    if (!req.user?.id) {
      throw new UnauthorizedException(
        'User authentication required. Please login to perform this action.',
      );
    }
    const userId = req.user.id;
    const vendor = await this.vendorsService.create(createVendorDto, userId);
    return {
      message: 'Vendor created successfully',
      data: { vendor },
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all vendors with filtering and pagination' })
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
    description: 'Search by name, contact, email, phone',
  })
  @ApiQuery({
    name: 'vendorType',
    required: false,
    description:
      'Filter by vendor type (SUPPLIER, SERVICE, MANUFACTURER, DISTRIBUTOR, CONTRACTOR, BOTH)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status (ACTIVE, INACTIVE)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort by field (name, type, status, createdAt)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (asc, desc)',
  })
  @ApiResponse({
    status: 200,
    description: 'Vendors retrieved successfully',
    schema: {
      example: {
        message: 'Vendors retrieved successfully',
        data: {
          vendors: [
            {
              id: 1,
              name: 'Apple Store',
              vendorType: 'SUPPLIER',
              contactPerson: 'John Smith',
              email: 'contact@apple.com',
              phone: '+1-800-275-2273',
              status: 'ACTIVE',
            },
          ],
          pagination: {
            totalCount: 150,
            currentPage: 1,
            totalPages: 15,
            hasNext: true,
            hasPrevious: false,
          },
        },
      },
    },
  })
  async findAll(@Query() queryDto: VendorQueryDto) {
    return this.vendorsService.findAll(queryDto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search vendors by query' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max results (default: 10, max: 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Vendor search completed',
    schema: {
      example: {
        message: 'Vendor search completed',
        data: {
          searchResults: [
            {
              id: 1,
              name: 'Apple Store',
              vendorType: 'SUPPLIER',
              contactPerson: 'John Smith',
              email: 'contact@apple.com',
              status: 'ACTIVE',
            },
          ],
          totalFound: 5,
        },
      },
    },
  })
  async search(@Query() searchDto: VendorSearchDto) {
    return this.vendorsService.search(searchDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vendor by ID' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiResponse({
    status: 200,
    description: 'Vendor retrieved successfully',
    schema: {
      example: {
        message: 'Vendor retrieved successfully',
        data: {
          vendor: {
            id: 1,
            name: 'Apple Store',
            vendorType: 'SUPPLIER',
            contactPerson: 'John Smith',
            email: 'contact@apple.com',
            phone: '+1-800-275-2273',
            address: '1 Apple Park Way, Cupertino, CA',
            taxId: 'GSTIN12345',
            panNumber: 'ABCDE1234F',
            notes: 'Premium electronics supplier',
            status: 'ACTIVE',
            assets: [],
            maintenanceSchedules: [],
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vendorsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update vendor by ID' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiResponse({
    status: 200,
    description: 'Vendor updated successfully',
    schema: {
      example: {
        message: 'Vendor updated successfully',
        data: {
          vendor: {
            id: 1,
            name: 'Updated Vendor Name',
            vendorType: 'SUPPLIER',
            status: 'ACTIVE',
            updatedAt: '2024-01-15T10:30:00Z',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Vendor name or email already exists',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVendorDto: UpdateVendorDto,
    @Request() req: any,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException(
        'User authentication required. Please login to perform this action.',
      );
    }
    const userId = req.user.id;
    return this.vendorsService.update(id, updateVendorDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete vendor by ID' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiResponse({
    status: 200,
    description: 'Vendor deleted successfully',
    schema: {
      example: {
        message: 'Vendor deleted successfully',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiResponse({
    status: 400,
    description:
      'Cannot delete vendor with associated assets or maintenance schedules',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.vendorsService.remove(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update vendor status' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiBody({
    description: 'Status update payload',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED'],
          example: 'ACTIVE',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Vendor status updated successfully',
    schema: {
      example: {
        message: 'Vendor status updated successfully',
        data: {
          vendor: {
            id: 1,
            status: 'INACTIVE',
            updatedAt: '2024-01-15T10:30:00Z',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() statusDto: VendorStatusDto,
    @Request() req: any,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException(
        'User authentication required. Please login to perform this action.',
      );
    }
    const userId = req.user.id;
    return this.vendorsService.updateStatus(id, statusDto, userId);
  }

  @Post('check-name')
  @ApiOperation({ summary: 'Check if vendor name already exists' })
  @ApiBody({
    description: 'Vendor name check payload',
    type: CheckVendorNameDto,
    schema: {
      example: {
        name: 'TechCorp Solutions',
        excludeId: '123',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Vendor name availability check completed',
    type: VendorNameCheckResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid vendor name or validation error',
    schema: {
      example: {
        message: 'Validation failed',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - User authentication required',
    schema: {
      example: {
        message: 'Unauthorized',
        statusCode: 401,
      },
    },
  })
  async checkVendorName(
    @Body() checkVendorNameDto: CheckVendorNameDto,
    @Request() req: any,
  ): Promise<VendorNameCheckResponseDto> {
    if (!req.user?.id) {
      throw new UnauthorizedException(
        'User authentication required. Please login to check vendor names.',
      );
    }

    const userId = req.user.id;
    let excludeIdNumber: number | undefined;

    if (checkVendorNameDto.excludeId) {
      excludeIdNumber = Number.parseInt(checkVendorNameDto.excludeId);
    }

    return this.vendorsService.checkVendorNameExists(
      checkVendorNameDto.name.trim(),
      excludeIdNumber,
      userId,
    );
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
          description: 'CSV or Excel file containing vendor data',
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
              field: 'name',
              message: 'Vendor name already exists in database',
              value: 'TechCorp Solutions',
            },
            {
              row: 12,
              field: 'email',
              message: 'Invalid email format',
              value: 'invalid-email',
            },
            {
              row: 15,
              field: 'vendorType',
              message:
                'Invalid vendor type. Must be one of: SUPPLIER, SERVICE, MANUFACTURER, DISTRIBUTOR, CONTRACTOR, BOTH',
              value: 'INVALID_TYPE',
            },
            {
              row: 20,
              field: 'status',
              message:
                'Invalid vendor status. Must be one of: ACTIVE, INACTIVE',
              value: 'INVALID_STATUS',
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
        'User authentication required. Please login to validate vendors.',
      );
    }
    const userId = req.user.id;
    return this.vendorsService.validateBulkUpload(file, userId);
  }

  @Post('bulk-upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Bulk upload vendors from CSV/Excel file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload with optional validation',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV or Excel file containing vendor data',
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
    description: 'Vendors uploaded successfully',
    schema: {
      example: {
        message: 'Vendors uploaded successfully',
        data: {
          imported: 95,
          errors: [
            {
              row: 5,
              field: 'email',
              message: 'Invalid email format',
            },
          ],
          summary: {
            totalRows: 100,
            successfulImports: 95,
            failedImports: 5,
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
        'User authentication required. Please login to perform this action.',
      );
    }
    const userId = req.user.id;
    const isValidateOnly = validateOnly === 'true';
    return this.vendorsService.bulkUpload(file, userId, isValidateOnly);
  }
}

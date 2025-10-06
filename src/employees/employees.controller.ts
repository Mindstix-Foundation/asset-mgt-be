import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  UploadedFile,
  UseInterceptors,
  Res,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import {
  QueryEmployeeDto,
  QueryEmployeeAssetEventsDto,
} from './dto/query-employee.dto';
import {
  EmployeeListResponseDto,
  EmployeeDetailResponseDto,
} from './dto/employee-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('employees')
@ApiBearerAuth('JWT-auth')
@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new employee' })
  @ApiResponse({
    status: 201,
    description: 'Employee created successfully',
    schema: {
      example: {
        message: 'Employee created successfully',
        data: {
          employee: {
            id: 'uuid-string',
            employeeId: 'EMP001',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@company.com',
            phone: '+91 9876543210',
            dateOfBirth: '1990-05-15',
            address: '123 Main Street, City',
            status: 'ACTIVE',
            createdAt: '2024-01-15T10:30:00Z',
            assignedAssetsCount: 0,
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation failed' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Employee ID or email already exists',
  })
  async create(
    @Body() createEmployeeDto: CreateEmployeeDto,
    @Request() req: any,
  ): Promise<EmployeeDetailResponseDto> {
    return this.employeesService.create(createEmployeeDto, req.user.id);
  }

  @Get('check-email')
  @ApiOperation({ summary: 'Check if an email is available for employee' })
  @ApiQuery({ name: 'email', required: true, type: String })
  @ApiQuery({
    name: 'excludeId',
    required: false,
    type: String,
    description: 'Employee ID to exclude from check (for edit mode)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns availability boolean',
    schema: { example: { available: true } },
  })
  async checkEmail(
    @Query('email') email: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const available = await this.employeesService.isEmailAvailable(
      email,
      excludeId,
    );
    return { message: 'Email availability', data: { available } };
  }

  @Get()
  @ApiOperation({ summary: 'Get all employees with filtering and pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name, employee ID, or email',
    example: 'john',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ACTIVE', 'INACTIVE'],
    description: 'Filter by status',
    example: 'ACTIVE',
  })
  @ApiQuery({
    name: 'hasAssets',
    required: false,
    type: Boolean,
    description: 'Filter by asset assignment',
    example: true,
  })
  @ApiQuery({
    name: 'assetCountRange',
    required: false,
    enum: ['0', '1-2', '3+'],
    description: 'Filter by asset count range',
    example: '1-2',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['name', 'employeeId', 'email', 'status', 'createdAt'],
    description: 'Sort by field (default: name)',
    example: 'name',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order (default: asc)',
    example: 'asc',
  })
  @ApiResponse({
    status: 200,
    description: 'Employees retrieved successfully',
    schema: {
      example: {
        message: 'Employees retrieved successfully',
        data: {
          employees: [
            {
              id: 'uuid-string',
              employeeId: 'EMP001',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@company.com',
              phone: '+91 9876543210',
              status: 'ACTIVE',
              assignedAssetsCount: 2,
              assignedAssets: [
                {
                  assetId: 'AST001',
                  assetName: 'Laptop Dell Inspiron',
                  assignedDate: '2024-01-15',
                  status: 'ACTIVE',
                },
              ],
            },
          ],
          pagination: {
            totalCount: 153,
            currentPage: 1,
            totalPages: 16,
            hasNext: true,
            hasPrevious: false,
          },
        },
      },
    },
  })
  async findAll(
    @Query() query: QueryEmployeeDto,
  ): Promise<EmployeeListResponseDto> {
    return this.employeesService.findAll(query);
  }

  @Get('dropdowns')
  @ApiOperation({
    summary: 'Get all employees for dropdown selection (ID and name only)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ACTIVE', 'INACTIVE'],
    description: 'Filter by status (default: ACTIVE)',
    example: 'ACTIVE',
  })
  @ApiQuery({
    name: 'hasAssignedAssets',
    required: false,
    type: 'boolean',
    description:
      'Filter employees who have at least one asset currently assigned',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Employees retrieved successfully for dropdown',
    schema: {
      example: {
        message: 'Employees retrieved successfully',
        data: {
          employees: [
            {
              id: 'uuid-string',
              employeeId: 'EMP001',
              firstName: 'John',
              lastName: 'Doe',
              name: 'John Doe',
            },
            {
              id: 'uuid-string-2',
              employeeId: 'EMP002',
              firstName: 'Jane',
              lastName: 'Smith',
              name: 'Jane Smith',
            },
          ],
        },
      },
    },
  })
  async findAllForDropdowns(
    @Query('status') status?: string,
    @Query('hasAssignedAssets') hasAssignedAssets?: string,
  ) {
    const hasAssignedAssetsBool = hasAssignedAssets === 'true';
    return this.employeesService.findAllForDropdowns(
      status,
      hasAssignedAssetsBool,
    );
  }

  @Get('test-route')
  async testRoute() {
    return { message: 'Test route working' };
  }

  @Get('non-admin-dropdown')
  @ApiOperation({
    summary:
      'Get active employees with email addresses excluding admins for dropdown selection',
  })
  @ApiResponse({
    status: 200,
    description:
      'Active non-admin employees with email addresses retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getNonAdminEmployeesForDropdown() {
    return this.employeesService.getNonAdminEmployeesForDropdown();
  }

  @Get('export')
  @ApiOperation({ summary: 'Export employees to Excel with asset details' })
  @ApiResponse({
    status: 200,
    description: 'Excel file generated successfully',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async exportEmployeesToExcel(
    @Query() queryDto: QueryEmployeeDto,
    @Res() res: any,
  ) {
    try {
      const excelBuffer =
        await this.employeesService.exportEmployeesToExcel(queryDto);

      // Set response headers
      const filename = `employees_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.setHeader('Content-Length', excelBuffer.length);

      // Send the Excel file
      res.send(excelBuffer);
    } catch (error) {
      console.error('Error exporting employees:', error);
      res.status(500).json({
        message: 'Failed to export employees',
        error: error.message,
      });
    }
  }

  @Get('deletable')
  @ApiOperation({
    summary:
      'Get employees who can be deleted (non-admin with no asset history)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name, employee ID, or email',
    example: 'john',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['name', 'employeeId', 'email', 'status', 'createdAt'],
    description: 'Sort by field (default: name)',
    example: 'name',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order (default: asc)',
    example: 'asc',
  })
  @ApiResponse({
    status: 200,
    description: 'Deletable employees retrieved successfully',
    schema: {
      example: {
        message: 'Deletable employees retrieved successfully',
        data: {
          employees: [
            {
              id: 'uuid-string',
              employeeId: 'EMP001',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@company.com',
              phone: '+91 9876543210',
              status: 'ACTIVE',
              assignedAssetsCount: 0,
              assignedAssets: [],
              isAdmin: false,
            },
          ],
          pagination: {
            totalCount: 5,
            currentPage: 1,
            totalPages: 1,
            hasNext: false,
            hasPrevious: false,
          },
        },
      },
    },
  })
  async getDeletableEmployees(
    @Query() query: QueryEmployeeDto,
  ): Promise<EmployeeListResponseDto> {
    return this.employeesService.getDeletableEmployees(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee by ID' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiQuery({
    name: 'include_assets',
    required: false,
    type: Boolean,
    description: 'Include assigned assets (default: true)',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Employee retrieved successfully',
    schema: {
      example: {
        message: 'Employee retrieved successfully',
        data: {
          employee: {
            id: 'uuid-string',
            employeeId: 'EMP001',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@company.com',
            phone: '+91 9876543210',
            dateOfBirth: '1990-05-15',
            address: '123 Main Street, City',
            status: 'ACTIVE',
            createdAt: '2024-01-15T10:30:00Z',
            assignedAssetsCount: 2,
            assignedAssets: [
              {
                assetId: 'AST001',
                assetName: 'Laptop Dell Inspiron',
                assignedDate: '2024-01-15',
                status: 'ACTIVE',
              },
            ],
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async findOne(
    @Param('id') id: string,
    @Query('include_assets') includeAssets?: string,
  ): Promise<EmployeeDetailResponseDto> {
    const shouldIncludeAssets = includeAssets !== 'false';
    return this.employeesService.findOne(id, shouldIncludeAssets);
  }

  @Get(':id/asset-history')
  @ApiOperation({ summary: 'Get complete asset history for an employee' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({
    status: 200,
    description: 'Asset history retrieved successfully',
    schema: {
      example: {
        message: 'Asset history retrieved successfully',
        data: {
          assetHistory: [
            {
              id: 1,
              assetId: 'AST001',
              assetName: 'Laptop Dell Inspiron',
              assetType: 'Laptop',
              brand: 'Dell',
              model: 'Inspiron 15',
              action: 'RETURNED',
              issueDate: '2024-01-15T10:30:00Z',
              returnDate: '2024-02-15T14:30:00Z',
              issueCondition: 'EXCELLENT',
              returnCondition: 'GOOD',
              issueReason: 'New employee onboarding',
              returnReason: 'Employee resignation',
              notes: 'Asset returned in good condition',
              issuedBy: 'admin',
              returnedBy: 'admin',
              duration: 31,
            },
            {
              id: 2,
              assetId: 'AST002',
              assetName: 'Monitor Samsung 24"',
              assetType: 'Monitor',
              brand: 'Samsung',
              model: '24" LED',
              action: 'ASSIGNED',
              issueDate: '2024-02-20T09:00:00Z',
              issueCondition: 'EXCELLENT',
              issueReason: 'Additional equipment needed',
              notes: 'For home office setup',
              issuedBy: 'admin',
              duration: 15,
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async getAssetHistory(@Param('id') id: string) {
    return this.employeesService.getAssetHistory(id);
  }

  @Get(':id/asset-events')
  @ApiOperation({
    summary:
      'Get per-event asset history (ASSIGNED/RETURNED as separate events)',
  })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({
    status: 200,
    description: 'Asset events retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async getAssetEvents(
    @Param('id') id: string,
    @Query() query: QueryEmployeeAssetEventsDto,
  ) {
    return this.employeesService.getAssetEvents(id, query);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update employee by ID' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({
    status: 200,
    description: 'Employee updated successfully',
    schema: {
      example: {
        message: 'Employee updated successfully',
        data: {
          employee: {
            id: 'uuid-string',
            employeeId: 'EMP001',
            firstName: 'John Updated',
            lastName: 'Doe',
            email: 'john.doe.updated@company.com',
            status: 'ACTIVE',
            updatedAt: '2024-01-15T10:30:00Z',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Cannot update email or deactivate admin employees',
  })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Employee ID or email already exists',
  })
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @Request() req: any,
  ): Promise<EmployeeDetailResponseDto> {
    return this.employeesService.update(id, updateEmployeeDto, req.user.id);
  }

  @Post('bulk-upload/validate')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Validate bulk upload file for employees' })
  @ApiBody({
    description: 'File upload for validation only',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV or Excel file containing employee data',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'File validation completed' })
  @ApiResponse({
    status: 400,
    description: 'Invalid file format or validation errors',
  })
  async validateBulkUpload(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    console.log(
      'EmployeesController.validateBulkUpload: Received validation request',
    );
    console.log('EmployeesController.validateBulkUpload: File details:', {
      fieldname: file?.fieldname,
      originalname: file?.originalname,
      mimetype: file?.mimetype,
      size: file?.size,
      buffer: file?.buffer
        ? `Buffer(${file.buffer.length} bytes)`
        : 'undefined',
    });
    console.log(
      'EmployeesController.validateBulkUpload: User ID:',
      req.user?.id || 1,
    );

    if (!file) {
      console.error('EmployeesController.validateBulkUpload: No file received');
      throw new BadRequestException('File is required');
    }

    const userId = req.user?.id || 1;
    return this.employeesService.bulkUpload(file, userId, true);
  }

  @Post('bulk-upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Bulk upload employees from CSV/Excel file' })
  @ApiBody({
    description: 'File upload with optional validation',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV or Excel file containing employee data',
        },
        validateOnly: {
          type: 'string',
          enum: ['true', 'false'],
          description: 'Validate only without inserting',
          example: 'false',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Employees uploaded successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid file format or validation errors',
  })
  async bulkUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body('validateOnly') validateOnly: string,
    @Request() req: any,
  ) {
    const userId = req.user?.id || 1;
    const isValidateOnly = validateOnly === 'true';
    return this.employeesService.bulkUpload(file, userId, isValidateOnly);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete employee by ID' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiBody({
    description: 'Optional reassignment of assets',
    schema: {
      type: 'object',
      properties: {
        reassign_assets_to: {
          type: 'string',
          description: 'Employee ID to reassign assets to',
          example: 'EMP002',
        },
      },
    },
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Employee deleted successfully',
    schema: {
      example: {
        message: 'Employee deleted successfully',
        data: {
          employee: {
            id: 'uuid-string',
            employeeId: 'EMP001',
            status: 'INACTIVE',
            deletedAt: '2024-01-15T10:30:00Z',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @ApiResponse({
    status: 400,
    description:
      'Cannot delete employee with assigned assets without reassignment',
  })
  async remove(
    @Param('id') id: string,
    @Request() req: any,
    @Body('reassign_assets_to') reassignAssetsTo?: string,
  ): Promise<EmployeeDetailResponseDto> {
    return this.employeesService.remove(id, req.user.id, reassignAssetsTo);
  }
}

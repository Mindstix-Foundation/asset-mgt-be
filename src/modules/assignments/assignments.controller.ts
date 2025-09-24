import { Controller, Get, Post, Body, Put, Param, Query, ParseIntPipe, HttpStatus, HttpCode, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto, ReturnAssignmentDto, AssignmentQueryDto } from './dto';

@ApiTags('assignments')
@ApiBearerAuth('JWT-auth')
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Issue an asset to an employee (Create assignment)' })
  @ApiResponse({ 
    status: 201, 
    description: 'Asset assigned successfully',
    schema: {
      example: {
        message: 'Asset assigned successfully',
        data: {
          assignment: {
            id: 1,
            assetId: 1,
            employeeId: 1,
            issueDate: '2024-09-18',
            issueCondition: 'GOOD',
            issueReason: 'Work from home setup',
            notes: 'Employee needs laptop for remote work',
            asset: {
              id: 1,
              assetId: 'AST001',
              assetType: { id: 1, name: 'Laptop' },
              brand: { id: 1, name: 'Apple' },
              model: { id: 1, name: 'MacBook Pro 16"' },
              condition: 'GOOD',
              status: 'ASSIGNED'
            },
            employee: {
              id: 1,
              employeeId: 'EMP001',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@company.com'
            },
            issuedByUser: {
              id: 1,
              username: 'admin'
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Asset not available or validation failed' })
  @ApiResponse({ status: 404, description: 'Asset or employee not found' })
  async create(@Body() createAssignmentDto: CreateAssignmentDto, @Request() req: any) {
    const userId = req.user?.id || await this.assignmentsService.getOrCreateDefaultUser();
    return this.assignmentsService.create(createAssignmentDto, userId);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active assignments (for collect asset page)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10, max: 100)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by asset ID, employee name, or notes' })
  @ApiQuery({ name: 'assetId', required: false, description: 'Filter by asset ID' })
  @ApiQuery({ name: 'employeeId', required: false, description: 'Filter by employee ID' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort by field (issueDate, returnDate, createdAt, updatedAt)' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order (asc, desc)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Active assignments retrieved successfully',
    schema: {
      example: {
        message: 'Active assignments retrieved successfully',
        data: {
          assignments: [
            {
              id: 1,
              assetId: 1,
              employeeId: 1,
              issueDate: '2024-09-18',
              returnDate: null,
              issueCondition: 'GOOD',
              issueReason: 'Work from home setup',
              asset: {
                id: 1,
                assetId: 'AST001',
                assetType: { id: 1, name: 'Laptop' },
                brand: { id: 1, name: 'Apple' },
                model: { id: 1, name: 'MacBook Pro 16"' },
                condition: 'GOOD',
                status: 'ASSIGNED',
                location: 'Office Floor 3'
              },
              employee: {
                id: 1,
                employeeId: 'EMP001',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@company.com'
              },
              issuedByUser: {
                id: 1,
                username: 'admin'
              }
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
  async findAllActive(@Query() queryDto: AssignmentQueryDto) {
    return this.assignmentsService.findAllActive(queryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all assignments with filtering' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10, max: 100)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by asset ID, employee name, or notes' })
  @ApiQuery({ name: 'assetId', required: false, description: 'Filter by asset ID' })
  @ApiQuery({ name: 'employeeId', required: false, description: 'Filter by employee ID' })
  @ApiQuery({ name: 'active', required: false, description: 'Filter by active status (true/false)' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort by field (issueDate, returnDate, createdAt, updatedAt)' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order (asc, desc)' })
  @ApiResponse({ status: 200, description: 'Assignments retrieved successfully' })
  async findAll(@Query() queryDto: AssignmentQueryDto) {
    return this.assignmentsService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get assignment by ID' })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiResponse({ status: 200, description: 'Assignment retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.assignmentsService.findOne(id);
  }

  @Put(':id/return')
  @ApiOperation({ summary: 'Return an asset (for collect asset page)' })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Asset returned successfully',
    schema: {
      example: {
        message: 'Asset returned successfully',
        data: {
          assignment: {
            id: 1,
            assetId: 1,
            employeeId: 1,
            issueDate: '2024-09-18',
            returnDate: '2024-09-20',
            issueCondition: 'GOOD',
            returnCondition: 'GOOD',
            returnReason: 'Project completed',
            notes: 'Asset returned in good condition',
            asset: {
              id: 1,
              assetId: 'AST001',
              assetType: { id: 1, name: 'Laptop' },
              brand: { id: 1, name: 'Apple' },
              model: { id: 1, name: 'MacBook Pro 16"' },
              condition: 'GOOD',
              status: 'AVAILABLE'
            },
            employee: {
              id: 1,
              employeeId: 'EMP001',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@company.com'
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  @ApiResponse({ status: 400, description: 'Asset has already been returned' })
  async returnAsset(
    @Param('id', ParseIntPipe) id: number, 
    @Body() returnAssignmentDto: ReturnAssignmentDto,
    @Request() req: any
  ) {
    const userId = req.user?.id || await this.assignmentsService.getOrCreateDefaultUser();
    return this.assignmentsService.returnAsset(id, returnAssignmentDto, userId);
  }
} 
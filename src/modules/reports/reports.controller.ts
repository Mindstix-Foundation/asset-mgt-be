import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { GenerateReportDto } from './dto';

@ApiTags('reports')
@ApiBearerAuth('JWT-auth')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate and export reports in various formats' })
  @ApiResponse({
    status: 200,
    description: 'Report generated successfully',
    schema: {
      example: {
        message: 'Report generated successfully',
        data: {
          reportType: 'assets',
          format: 'csv',
          title: 'Assets Report',
          fileName: 'assets-report-2024-09-18.csv',
          mimeType: 'text/csv',
          content:
            'QXNzZXQgSUQsU2VyaWFsIE51bWJlcixDYXRlZ29yeSxBc3NldCBUeXBlLEJyYW5kLE1vZGVsLENvbmRpdGlvbixTdGF0dXMsLi4u',
          recordCount: 150,
          generatedAt: '2024-09-18T14:30:00.000Z',
          filters: {
            assetTypeId: 1,
            status: 'AVAILABLE',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid report type, format, or filters',
    schema: {
      example: {
        message:
          'Error generating report: Unsupported report type: invalid-type',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async generateReport(@Body() generateReportDto: GenerateReportDto) {
    return this.reportsService.generateReport(generateReportDto);
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateVendorDto,
  UpdateVendorDto,
  VendorQueryDto,
  VendorSearchDto,
  VendorStatusDto,
} from './dto';
import { Vendor, Prisma, VendorStatus, VendorType } from '@prisma/client';
import * as XLSX from 'xlsx';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createVendorDto: CreateVendorDto,
    userId: number,
  ): Promise<Vendor> {
    try {
      // Check if vendor name already exists
      const existingVendor = await this.prisma.vendor.findFirst({
        where: { name: createVendorDto.name },
      });

      if (existingVendor) {
        throw new ConflictException('Vendor name already exists');
      }

      // Check if email already exists (if provided)
      if (createVendorDto.email) {
        const existingEmail = await this.prisma.vendor.findFirst({
          where: { email: createVendorDto.email },
        });

        if (existingEmail) {
          throw new ConflictException('Email already exists');
        }
      }

      const vendor = await this.prisma.vendor.create({
        data: {
          ...createVendorDto,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      return vendor;
    } catch (error) {
      console.error('Vendor creation error:', error);
      if (error instanceof ConflictException) {
        throw error;
      }

      // More specific error handling
      if (error.code === 'P2002') {
        throw new ConflictException(
          'A vendor with this information already exists',
        );
      }

      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Invalid user reference. User not found.',
        );
      }

      throw new BadRequestException(
        `Failed to create vendor: ${error.message || error}`,
      );
    }
  }

  async findAll(queryDto: VendorQueryDto) {
    const { search, vendorType, status, sortBy, sortOrder } = queryDto;
    const page = queryDto.page || 1;
    const limit = Math.min(queryDto.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.VendorWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (vendorType) {
      where.vendorType = vendorType;
    }

    if (status) {
      where.status = status;
    }

    // Build orderBy clause
    const orderBy: Prisma.VendorOrderByWithRelationInput = {};
    switch (sortBy) {
      case 'name':
        orderBy.name = sortOrder;
        break;
      case 'type':
        orderBy.vendorType = sortOrder;
        break;
      case 'status':
        orderBy.status = sortOrder;
        break;
      case 'createdAt':
        orderBy.createdAt = sortOrder;
        break;
      default:
        orderBy.name = 'asc';
    }

    const [vendors, totalCount] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
          _count: {
            select: {
              assets: true,
            },
          },
        },
      }),
      this.prisma.vendor.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      message: 'Vendors retrieved successfully',
      data: {
        vendors,
        pagination: {
          totalCount,
          currentPage: page,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      },
    };
  }

  async findOne(id: number): Promise<{
    message: string;
    data: {
      vendor: Vendor & {
        user: { id: number; username: string } | null;
        assets: Array<{ id: number; assetId: string; status: string }>;
        _count: { assets: number };
      };
    };
  }> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        assets: {
          select: {
            id: true,
            assetId: true,
            status: true,
          },
          take: 10, // Limit to recent 10 assets
        },
        _count: {
          select: {
            assets: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return {
      message: 'Vendor retrieved successfully',
      data: { vendor },
    };
  }

  async update(
    id: number,
    updateVendorDto: UpdateVendorDto,
    userId: number,
  ): Promise<{ message: string; data: { vendor: Vendor } }> {
    // Check if vendor exists
    const existingVendor = await this.prisma.vendor.findUnique({
      where: { id },
    });

    if (!existingVendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Check if name already exists (if being updated)
    if (updateVendorDto.name && updateVendorDto.name !== existingVendor.name) {
      const nameExists = await this.prisma.vendor.findFirst({
        where: {
          name: updateVendorDto.name,
          id: { not: id },
        },
      });

      if (nameExists) {
        throw new ConflictException('Vendor name already exists');
      }
    }

    // Check if email already exists (if being updated)
    if (
      updateVendorDto.email &&
      updateVendorDto.email !== existingVendor.email
    ) {
      const emailExists = await this.prisma.vendor.findFirst({
        where: {
          email: updateVendorDto.email,
          id: { not: id },
        },
      });

      if (emailExists) {
        throw new ConflictException('Email already exists');
      }
    }

    try {
      const vendor = await this.prisma.vendor.update({
        where: { id },
        data: {
          ...updateVendorDto,
          updatedBy: userId,
        },
      });

      return {
        message: 'Vendor updated successfully',
        data: { vendor },
      };
    } catch (error) {
      console.error('Failed to update vendor:', error);
      throw new BadRequestException('Failed to update vendor');
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    // Check if vendor exists
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assets: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Check if vendor has associated assets or maintenance schedules
    if (vendor._count.assets > 0) {
      throw new BadRequestException(
        'Cannot delete vendor with associated assets',
      );
    }

    await this.prisma.vendor.delete({
      where: { id },
    });

    return {
      message: 'Vendor deleted successfully',
    };
  }

  async updateStatus(
    id: number,
    statusDto: VendorStatusDto,
    userId: number,
  ): Promise<{ message: string; data: { vendor: Vendor } }> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const updatedVendor = await this.prisma.vendor.update({
      where: { id },
      data: {
        status: statusDto.status,
        updatedBy: userId,
      },
    });

    return {
      message: 'Vendor status updated successfully',
      data: { vendor: updatedVendor },
    };
  }

  async search(searchDto: VendorSearchDto) {
    const { q, limit } = searchDto;

    // Helper function to check if query matches any VendorType enum value
    const getVendorTypeFilter = (query: string) => {
      const upperQuery = query.toUpperCase();
      const matchingTypes = Object.values(VendorType).filter((type) =>
        type.includes(upperQuery),
      );
      return matchingTypes.length > 0
        ? { vendorType: { in: matchingTypes } }
        : null;
    };

    const vendorTypeFilter = getVendorTypeFilter(q);
    const orConditions: Prisma.VendorWhereInput[] = [
      { name: { contains: q, mode: 'insensitive' } },
      { contactPerson: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
    ];

    // Add vendorType filter only if there are matching enum values
    if (vendorTypeFilter) {
      orConditions.push(vendorTypeFilter);
    }

    const vendors = await this.prisma.vendor.findMany({
      where: {
        OR: orConditions,
      },
      take: limit,
      select: {
        id: true,
        name: true,
        vendorType: true,
        contactPerson: true,
        email: true,
        phone: true,
        status: true,
      },
    });

    return {
      message: 'Vendor search completed',
      data: {
        searchResults: vendors,
        totalFound: vendors.length,
      },
    };
  }

  /**
   * Validate uploaded file for bulk upload
   */
  private validateUploadedFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file format. Only CSV and Excel files are allowed',
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException(
        'File size too large. Maximum 10MB allowed',
      );
    }
  }

  /**
   * Parse Excel file to JSON data
   */
  private parseFileToData(file: Express.Multer.File): any[] {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      throw new BadRequestException('File is empty or has no valid data');
    }

    return data;
  }

  /**
   * Validate headers in parsed data
   */
  private validateHeaders(data: any[]): void {
    const firstRow = data[0];
    const headers = new Set(Object.keys(firstRow).map((h) => h.trim().toLowerCase()));
    const requiredHeaders = ['vendor name', 'name'];

    // Check if at least one required header exists
    const hasRequiredHeader = requiredHeaders.some((header) =>
      headers.has(header),
    );

    if (!hasRequiredHeader) {
      throw new BadRequestException(
        `Missing required headers: ${requiredHeaders.join(', ')}`,
      );
    }
  }

  /**
   * Load existing vendor data for validation
   */
  private async loadExistingVendorData(): Promise<{
    existingNames: Set<string>;
    existingEmails: Set<string>;
  }> {
    const existingVendors = await this.prisma.vendor.findMany({
      select: { name: true, email: true },
    });

    const existingNames = new Set(
      existingVendors.map((v) => v.name.toLowerCase()),
    );
    const existingEmails = new Set(
      existingVendors
        .map((v) => v.email?.toLowerCase())
        .filter((e): e is string => e !== null && e !== undefined),
    );

    return { existingNames, existingEmails };
  }

  /**
   * Map row data to CreateVendorDto
   */
  private mapRowToVendorDto(row: any): CreateVendorDto {
    return {
      name: row['Vendor Name'] || row['name'],
      vendorType: (row['Type'] ||
        row['vendor_type'] ||
        VendorType.SUPPLIER) as VendorType,
      contactPerson: row['Contact Person'] || row['contact_person'],
      email: row['Email'] || row['email'],
      phone: row['Phone'] || row['phone'],
      address: row['Address'] || row['address'],
      status: (row['Status'] ||
        row['status'] ||
        VendorStatus.ACTIVE) as VendorStatus,
      taxId: row['Tax ID'] || row['tax_id'],
      panNumber: row['PAN Number'] || row['pan_number'],
      notes: row['Notes'] || row['notes'],
    };
  }

  /**
   * Validate vendor name field
   */
  private validateVendorName(
    vendor: CreateVendorDto,
    rowNumber: number,
    existingNames: Set<string>,
    fileNames: Set<string>,
    errors: Array<{
      row: number;
      field: string;
      message: string;
      value?: string;
    }>,
  ): boolean {
    if (!vendor.name || vendor.name.trim().length === 0) {
      errors.push({
        row: rowNumber,
        field: 'name',
        message: 'Vendor name is required',
      });
      return false;
    }

    if (vendor.name.length < 2 || vendor.name.length > 100) {
      errors.push({
        row: rowNumber,
        field: 'name',
        message: 'Vendor name must be between 2 and 100 characters',
      });
      return false;
    }

    // Check for duplicate names in database
    if (existingNames.has(vendor.name.toLowerCase())) {
      errors.push({
        row: rowNumber,
        field: 'name',
        message: 'Vendor name already exists in database',
        value: vendor.name,
      });
      return false;
    }

    // Check for duplicate names within the file
    if (fileNames.has(vendor.name.toLowerCase())) {
      errors.push({
        row: rowNumber,
        field: 'name',
        message: 'Duplicate vendor name within the file',
        value: vendor.name,
      });
      return false;
    }

    fileNames.add(vendor.name.toLowerCase());
    return true;
  }

  /**
   * Validate vendor email field
   */
  private validateVendorEmail(
    vendor: CreateVendorDto,
    rowNumber: number,
    existingEmails: Set<string>,
    fileEmails: Set<string>,
    errors: Array<{
      row: number;
      field: string;
      message: string;
      value?: string;
    }>,
  ): boolean {
    if (!vendor.email) {
      return true; // Email is optional
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vendor.email)) {
      errors.push({
        row: rowNumber,
        field: 'email',
        message: 'Invalid email format',
        value: vendor.email,
      });
      return false;
    }

    // Check for duplicate emails in database
    if (existingEmails.has(vendor.email.toLowerCase())) {
      errors.push({
        row: rowNumber,
        field: 'email',
        message: 'Email already exists in database',
        value: vendor.email,
      });
      return false;
    }

    // Check for duplicate emails within the file
    if (fileEmails.has(vendor.email.toLowerCase())) {
      errors.push({
        row: rowNumber,
        field: 'email',
        message: 'Duplicate email within the file',
        value: vendor.email,
      });
      return false;
    }

    fileEmails.add(vendor.email.toLowerCase());
    return true;
  }

  /**
   * Validate other vendor fields (PAN, type, status)
   */
  private validateOtherFields(
    vendor: CreateVendorDto,
    rowNumber: number,
    errors: Array<{
      row: number;
      field: string;
      message: string;
      value?: string;
    }>,
  ): boolean {
    // Validate PAN number format if provided
    if (vendor.panNumber && vendor.panNumber.length !== 10) {
      errors.push({
        row: rowNumber,
        field: 'panNumber',
        message: 'PAN number must be exactly 10 characters',
        value: vendor.panNumber,
      });
      return false;
    }

    // Validate vendor type
    const validTypes = Object.values(VendorType);
    if (vendor.vendorType && !validTypes.includes(vendor.vendorType)) {
      errors.push({
        row: rowNumber,
        field: 'vendorType',
        message: `Invalid vendor type. Must be one of: ${validTypes.join(', ')}`,
        value: vendor.vendorType,
      });
      return false;
    }

    // Validate vendor status
    const validStatuses = Object.values(VendorStatus);
    if (vendor.status && !validStatuses.includes(vendor.status)) {
      errors.push({
        row: rowNumber,
        field: 'status',
        message: `Invalid vendor status. Must be one of: ${validStatuses.join(', ')}`,
        value: vendor.status,
      });
      return false;
    }

    return true;
  }

  /**
   * Process and validate a single row
   */
  private processRow(
    row: any,
    rowNumber: number,
    existingNames: Set<string>,
    existingEmails: Set<string>,
    fileNames: Set<string>,
    fileEmails: Set<string>,
    errors: Array<{
      row: number;
      field: string;
      message: string;
      value?: string;
    }>,
  ): CreateVendorDto | null {
    const vendor = this.mapRowToVendorDto(row);

    // Validate all fields
    const nameValid = this.validateVendorName(
      vendor,
      rowNumber,
      existingNames,
      fileNames,
      errors,
    );
    const emailValid = this.validateVendorEmail(
      vendor,
      rowNumber,
      existingEmails,
      fileEmails,
      errors,
    );
    const otherFieldsValid = this.validateOtherFields(
      vendor,
      rowNumber,
      errors,
    );

    if (nameValid && emailValid && otherFieldsValid) {
      return vendor;
    }

    return null;
  }

  async validateBulkUpload(file: Express.Multer.File, userId: number) {
    this.validateUploadedFile(file);

    try {
      // Parse the file
      const data = this.parseFileToData(file);

      // Validate headers
      this.validateHeaders(data);

      const errors: Array<{
        row: number;
        field: string;
        message: string;
        value?: string;
      }> = [];
      const validVendors: CreateVendorDto[] = [];

      // Load existing vendor data for validation
      const { existingNames, existingEmails } =
        await this.loadExistingVendorData();

      // Track duplicates within the file
      const fileNames = new Set<string>();
      const fileEmails = new Set<string>();

      // Validate each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = i + 2; // +2 because Excel rows start at 1 and we skip header

        const validVendor = this.processRow(
          row,
          rowNumber,
          existingNames,
          existingEmails,
          fileNames,
          fileEmails,
          errors,
        );

        if (validVendor) {
          validVendors.push(validVendor);
        }
      }

      return {
        message: 'File validation completed',
        data: {
          totalRows: data.length,
          validRows: validVendors.length,
          invalidRows: errors.length,
          errors,
          summary: {
            totalRows: data.length,
            validRows: validVendors.length,
            invalidRows: errors.length,
            validationOnly: true,
          },
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to process file. Please check the file format and content',
      );
    }
  }

  /**
   * Import a single vendor
   */
  private async importSingleVendor(
    vendor: CreateVendorDto,
    rowNumber: number,
    userId: number,
  ): Promise<{ success: boolean; vendor?: Vendor; error?: any }> {
    try {
      // Check for duplicates in database
      const existingVendor = await this.prisma.vendor.findFirst({
        where: {
          OR: [
            { name: vendor.name },
            ...(vendor.email ? [{ email: vendor.email }] : []),
          ],
        },
      });

      if (existingVendor) {
        return {
          success: false,
          error: {
            row: rowNumber,
            field: existingVendor.name === vendor.name ? 'name' : 'email',
            message: `${existingVendor.name === vendor.name ? 'Vendor name' : 'Email'} already exists`,
          },
        };
      }

      const createdVendor = await this.prisma.vendor.create({
        data: {
          ...vendor,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      return { success: true, vendor: createdVendor };
    } catch (error) {
      console.error('Failed to create vendor from row:', rowNumber, error);
      return {
        success: false,
        error: {
          row: rowNumber,
          field: 'general',
          message: 'Failed to import vendor',
        },
      };
    }
  }

  async bulkUpload(
    file: Express.Multer.File,
    userId: number,
    validateOnly: boolean = false,
  ) {
    this.validateUploadedFile(file);

    try {
      const data = this.parseFileToData(file);
      this.validateHeaders(data);

      const errors: Array<{
        row: number;
        field: string;
        message: string;
        value?: string;
      }> = [];
      const validVendors: CreateVendorDto[] = [];

      // Load existing vendor data for validation
      const { existingNames, existingEmails } =
        await this.loadExistingVendorData();

      // Track duplicates within the file
      const fileNames = new Set<string>();
      const fileEmails = new Set<string>();

      // Process each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = i + 2; // +2 because Excel rows start at 1 and we skip header

        const vendor = this.processRow(
          row,
          rowNumber,
          existingNames,
          existingEmails,
          fileNames,
          fileEmails,
          errors,
        );
        if (vendor) {
          validVendors.push(vendor);
        }
      }

      if (validateOnly) {
        return {
          message: 'File validation completed',
          data: {
            totalRows: data.length,
            validRows: validVendors.length,
            errors,
            summary: {
              totalRows: data.length,
              validRows: validVendors.length,
              errorRows: errors.length,
            },
          },
        };
      }

      // Import valid vendors
      const imported: Vendor[] = [];
      const importErrors: Array<{
        row: number;
        field: string;
        message: string;
      }> = [];

      for (const vendor of validVendors) {
        const originalRowIndex = data.findIndex(
          (row: any) => (row['Vendor Name'] || row['name']) === vendor.name,
        );
        const rowNumber = originalRowIndex + 2;

        const result = await this.importSingleVendor(vendor, rowNumber, userId);
        if (result.success && result.vendor) {
          imported.push(result.vendor);
        } else if (result.error) {
          importErrors.push(result.error);
        }
      }

      return {
        message: 'Vendors uploaded successfully',
        data: {
          imported: imported.length,
          errors: [...errors, ...importErrors],
          summary: {
            totalRows: data.length,
            successfulImports: imported.length,
            failedImports: errors.length + importErrors.length,
          },
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to process file. Please check the file format and content',
      );
    }
  }

  async checkVendorNameExists(
    name: string,
    excludeId?: number,
    userId?: number,
  ) {
    try {
      // Build the where clause
      const whereClause: any = {
        name: {
          equals: name,
          mode: 'insensitive', // Case-insensitive comparison
        },
      };

      // Exclude the current vendor if editing
      if (excludeId) {
        whereClause.id = {
          not: excludeId,
        };
      }

      // Check if vendor name exists
      const existingVendor = await this.prisma.vendor.findFirst({
        where: whereClause,
        select: {
          id: true,
          name: true,
        },
      });

      const exists = !!existingVendor;
      const available = !exists;

      return {
        message: 'Vendor name availability checked',
        data: {
          name: name,
          available: available,
          exists: exists,
        },
      };
    } catch (error) {
      console.error('Error checking vendor name:', error);
      throw new BadRequestException('Failed to check vendor name availability');
    }
  }
}

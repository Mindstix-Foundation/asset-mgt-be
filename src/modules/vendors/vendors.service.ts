import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVendorDto, UpdateVendorDto, VendorQueryDto, VendorSearchDto, VendorStatusDto } from './dto';
import { Vendor, Prisma, VendorStatus, VendorType } from '@prisma/client';
import * as XLSX from 'xlsx';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateDefaultUser(): Promise<number> {
    try {
      // Try to find any existing user
      const existingUser = await this.prisma.user.findFirst();
      if (existingUser) {
        return existingUser.id;
      }

      // If no users exist, we need to create a default employee first
      const defaultEmployee = await this.prisma.employee.upsert({
        where: { employeeId: 'EMP001' },
        update: {},
        create: {
          employeeId: 'EMP001',
          firstName: 'System',
          lastName: 'Admin',
          email: 'admin@system.local',
          status: 'ACTIVE',
          createdBy: 1, // Self-reference for bootstrap
          updatedBy: 1,
        },
      });

      // Create a default user
      const defaultUser = await this.prisma.user.upsert({
        where: { username: 'system_admin' },
        update: {},
        create: {
          employeeId: defaultEmployee.id,
          username: 'system_admin',
          passwordHash: 'placeholder', // This should be properly hashed in real implementation
          createdBy: 1, // Self-reference for bootstrap
          updatedBy: 1,
        },
      });

      return defaultUser.id;
    } catch (error) {
      console.error('Error creating default user:', error);
      // Fallback to ID 1 if all else fails
      return 1;
    }
  }

  async create(createVendorDto: CreateVendorDto, userId: number): Promise<Vendor> {
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
        throw new ConflictException('A vendor with this information already exists');
      }
      
      if (error.code === 'P2003') {
        throw new BadRequestException('Invalid user reference. User not found.');
      }
      
      throw new BadRequestException(`Failed to create vendor: ${error.message || error}`);
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
              maintenanceSchedules: true,
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

  async findOne(id: number): Promise<{ message: string; data: { vendor: Vendor & any } }> {
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
        maintenanceSchedules: {
          select: {
            id: true,
            scheduledDate: true,
            status: true,
          },
          take: 10, // Limit to recent 10 schedules
        },
        _count: {
          select: {
            assets: true,
            maintenanceSchedules: true,
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

  async update(id: number, updateVendorDto: UpdateVendorDto, userId: number): Promise<{ message: string; data: { vendor: Vendor } }> {
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
    if (updateVendorDto.email && updateVendorDto.email !== existingVendor.email) {
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
            maintenanceSchedules: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Check if vendor has associated assets or maintenance schedules
    if (vendor._count.assets > 0 || vendor._count.maintenanceSchedules > 0) {
      throw new BadRequestException('Cannot delete vendor with associated assets or maintenance schedules');
    }

    await this.prisma.vendor.delete({
      where: { id },
    });

    return {
      message: 'Vendor deleted successfully',
    };
  }

  async updateStatus(id: number, statusDto: VendorStatusDto, userId: number): Promise<{ message: string; data: { vendor: Vendor } }> {
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
      const matchingTypes = Object.values(VendorType).filter(type => 
        type.includes(upperQuery)
      );
      return matchingTypes.length > 0 ? { vendorType: { in: matchingTypes } } : null;
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

  async bulkUpload(file: Express.Multer.File, userId: number, validateOnly: boolean = false) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Validate file type
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file format. Only CSV and Excel files are allowed');
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum 10MB allowed');
    }

    try {
      // Parse the file
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      if (data.length === 0) {
        throw new BadRequestException('File is empty or has no valid data');
      }

      const errors: Array<{ row: number; field: string; message: string }> = [];
      const validVendors: CreateVendorDto[] = [];

      // Validate each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i] as any;
        const rowNumber = i + 2; // +2 because Excel rows start at 1 and we skip header

        const vendor: CreateVendorDto = {
          name: row['Vendor Name'] || row['name'],
          vendorType: (row['Type'] || row['vendor_type'] || VendorType.SUPPLIER) as VendorType,
          contactPerson: row['Contact Person'] || row['contact_person'],
          email: row['Email'] || row['email'],
          phone: row['Phone'] || row['phone'],
          address: row['Address'] || row['address'],
          taxId: row['Tax ID'] || row['tax_id'],
          panNumber: row['PAN Number'] || row['pan_number'],
          notes: row['Notes'] || row['notes'],
        };

        // Validate required fields
        if (!vendor.name || vendor.name.trim().length === 0) {
          errors.push({
            row: rowNumber,
            field: 'name',
            message: 'Vendor name is required',
          });
          continue;
        }

        if (vendor.name.length < 2 || vendor.name.length > 100) {
          errors.push({
            row: rowNumber,
            field: 'name',
            message: 'Vendor name must be between 2 and 100 characters',
          });
          continue;
        }

        // Validate email format if provided
        if (vendor.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vendor.email)) {
          errors.push({
            row: rowNumber,
            field: 'email',
            message: 'Invalid email format',
          });
          continue;
        }

        // Validate PAN number format if provided
        if (vendor.panNumber && vendor.panNumber.length !== 10) {
          errors.push({
            row: rowNumber,
            field: 'panNumber',
            message: 'PAN number must be exactly 10 characters',
          });
          continue;
        }

        // Validate vendor type
        const validTypes = Object.values(VendorType);
        if (vendor.vendorType && !validTypes.includes(vendor.vendorType as VendorType)) {
          errors.push({
            row: rowNumber,
            field: 'vendorType',
            message: `Invalid vendor type. Must be one of: ${validTypes.join(', ')}`,
          });
          continue;
        }

        validVendors.push(vendor);
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
      const importErrors: Array<{ row: number; field: string; message: string }> = [];

      for (let i = 0; i < validVendors.length; i++) {
        const vendor = validVendors[i];
        const originalRowIndex = data.findIndex((row: any) => 
          (row['Vendor Name'] || row['name']) === vendor.name
        );
        const rowNumber = originalRowIndex + 2;

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
            importErrors.push({
              row: rowNumber,
              field: existingVendor.name === vendor.name ? 'name' : 'email',
              message: `${existingVendor.name === vendor.name ? 'Vendor name' : 'Email'} already exists`,
            });
            continue;
          }

          const createdVendor = await this.prisma.vendor.create({
            data: {
              ...vendor,
              createdBy: userId,
              updatedBy: userId,
            },
          });

          imported.push(createdVendor);
        } catch (error) {
          importErrors.push({
            row: rowNumber,
            field: 'general',
            message: 'Failed to import vendor',
          });
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
      throw new BadRequestException('Failed to process file. Please check the file format and content');
    }
  }
}

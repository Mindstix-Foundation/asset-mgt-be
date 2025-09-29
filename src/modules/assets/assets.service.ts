import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AssetIdService } from './asset-id.service';
import { CreateAssetDto, UpdateAssetDto, AssetQueryDto } from './dto';

@Injectable()
export class AssetsService {
  constructor(
    private prisma: PrismaService,
    private assetIdService: AssetIdService
  ) {}

  async create(createAssetDto: CreateAssetDto, userId: number) {
    try {
      // Generate sequential asset ID if not provided
      let assetId = createAssetDto.assetId;
      if (!assetId) {
        assetId = await this.assetIdService.generateNextAssetId();
      } else {
        // Validate provided asset ID format
        if (!this.assetIdService.validateAssetIdFormat(assetId)) {
          throw new BadRequestException('Invalid asset ID format. Expected format: AST-XXXX');
        }
        // Check if provided asset ID already exists
        if (await this.assetIdService.assetIdExists(assetId)) {
          throw new ConflictException('Asset ID already exists');
        }
      }

      // Verify all foreign keys exist
      const [assetType, brand, model, vendor] = await Promise.all([
        this.prisma.assetType.findUnique({ where: { id: createAssetDto.assetTypeId } }),
        this.prisma.brand.findUnique({ where: { id: createAssetDto.brandId } }),
        this.prisma.model.findUnique({ where: { id: createAssetDto.modelId } }),
        createAssetDto.vendorId 
          ? this.prisma.vendor.findUnique({ where: { id: createAssetDto.vendorId } })
          : Promise.resolve(null),
      ]);

      if (!assetType) throw new BadRequestException('Asset type not found');
      if (!brand) throw new BadRequestException('Brand not found');
      if (!model) throw new BadRequestException('Model not found');
      if (createAssetDto.vendorId && !vendor) throw new BadRequestException('Vendor not found');

      // Verify model belongs to the specified brand and asset type
      if (model.brandId !== createAssetDto.brandId) {
        throw new BadRequestException('Model does not belong to the specified brand');
      }
      if (model.assetTypeId !== createAssetDto.assetTypeId) {
        throw new BadRequestException('Model does not belong to the specified asset type');
      }

      const asset = await this.prisma.asset.create({
        data: {
          ...createAssetDto,
          assetId, // Use generated or validated asset ID
          purchaseDate: createAssetDto.purchaseDate ? new Date(createAssetDto.purchaseDate) : null,
          warrantyStartDate: createAssetDto.warrantyStartDate ? new Date(createAssetDto.warrantyStartDate) : null,
          warrantyEndDate: createAssetDto.warrantyEndDate ? new Date(createAssetDto.warrantyEndDate) : null,
          createdBy: userId,
          updatedBy: userId,
        },
        include: {
          assetType: {
            select: { 
              id: true, 
              name: true,
              category: { select: { id: true, name: true } }
            }
          },
          brand: { select: { id: true, name: true } },
          model: { select: { id: true, name: true, specifications: true } },
          vendor: { select: { id: true, name: true } },
          createdByUser: { select: { id: true, username: true } },
          _count: { select: { assetIssues: true } }
        },
      });

      return {
        message: 'Asset created successfully',
        data: { asset },
      };
    } catch (error) {
      if (error.code === 'P2002') {
        if (error.meta?.target?.includes('assetId')) {
          throw new ConflictException('Asset ID already exists');
        }
        if (error.meta?.target?.includes('serialNumber')) {
          throw new ConflictException('Serial number already exists');
        }
      }
      throw error;
    }
  }

  async findAll(queryDto: AssetQueryDto) {
    const { page = 1, limit = 10, search, assetTypeId, brandId, modelId, vendorId, status, condition, location, sortBy = 'assetId', sortOrder = 'asc' } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { assetId: { contains: search, mode: 'insensitive' as const } },
        { serialNumber: { contains: search, mode: 'insensitive' as const } },
        { notes: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    if (assetTypeId) where.assetTypeId = assetTypeId;
    if (brandId) where.brandId = brandId;
    if (modelId) where.modelId = modelId;
    if (vendorId) where.vendorId = vendorId;
    if (status) where.status = status;
    if (condition) where.condition = condition;
    if (location) where.location = { contains: location, mode: 'insensitive' as const };

    const orderBy = { [sortBy]: sortOrder } as any;

    const [assets, totalCount] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          assetType: {
            select: { 
              id: true, 
              name: true,
              category: { select: { id: true, name: true } }
            }
          },
          brand: { select: { id: true, name: true } },
          model: { select: { id: true, name: true } },
          vendor: { select: { id: true, name: true } },
          createdByUser: { select: { id: true, username: true } },
          assetIssues: {
            where: { returnDate: null }, // Only active assignments
            select: {
              id: true,
              issueDate: true,
              issueReason: true,
              notes: true,
              employee: {
                select: {
                  id: true,
                  employeeId: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              },
              issuedByUser: {
                select: {
                  id: true,
                  username: true
                }
              }
            },
            take: 1 // Only get the most recent active assignment
          },
          _count: { select: { assetIssues: true } }
        },
      }),
      this.prisma.asset.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      message: 'Assets retrieved successfully',
      data: {
        assets,
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

  async findOne(id: number) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        assetType: {
          select: { 
            id: true, 
            name: true,
            description: true,
            category: { select: { id: true, name: true, description: true } }
          }
        },
        brand: { 
          select: { id: true, name: true, description: true } 
        },
        model: { 
          select: { id: true, name: true, specifications: true } 
        },
        vendor: { 
          select: { id: true, name: true, contactPerson: true, email: true, phone: true } 
        },
        createdByUser: { select: { id: true, username: true } },
        updatedByUser: { select: { id: true, username: true } },
        assetIssues: {
          select: {
            id: true,
            issueDate: true,
            returnDate: true,
            issueCondition: true,
            returnCondition: true,
            issueReason: true,
            returnReason: true,
            notes: true,
            employee: {
              select: { 
                id: true, 
                firstName: true, 
                lastName: true, 
                email: true 
              }
            },
            issuedByUser: {
              select: { id: true, username: true }
            }
          },
          orderBy: { issueDate: 'desc' },
          take: 10
        },
        _count: { 
          select: { 
            assetIssues: true,
            maintenanceSchedules: true
          } 
        }
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return {
      message: 'Asset retrieved successfully',
      data: { asset },
    };
  }

  async update(id: number, updateAssetDto: UpdateAssetDto, userId: number) {
    try {
      // Validate assetId format if being updated
      if (updateAssetDto.assetId) {
        if (!this.assetIdService.validateAssetIdFormat(updateAssetDto.assetId)) {
          throw new BadRequestException('Invalid asset ID format. Expected format: AST-XXXX');
        }
        // Check if provided asset ID already exists (excluding current asset)
        const existingAsset = await this.prisma.asset.findFirst({
          where: {
            assetId: updateAssetDto.assetId,
            id: { not: id }
          }
        });
        if (existingAsset) {
          throw new ConflictException('Asset ID already exists');
        }
      }

      // Verify foreign keys if they're being updated
      if (updateAssetDto.assetTypeId || updateAssetDto.brandId || updateAssetDto.modelId || updateAssetDto.vendorId) {
        const verifications: Array<{ check: () => Promise<any>, error: string }> = [];
        
        if (updateAssetDto.assetTypeId) {
          verifications.push({
            check: () => this.prisma.assetType.findUnique({ where: { id: updateAssetDto.assetTypeId } }),
            error: 'Asset type not found'
          });
        }
        if (updateAssetDto.brandId) {
          verifications.push({
            check: () => this.prisma.brand.findUnique({ where: { id: updateAssetDto.brandId } }),
            error: 'Brand not found'
          });
        }
        if (updateAssetDto.modelId) {
          verifications.push({
            check: () => this.prisma.model.findUnique({ where: { id: updateAssetDto.modelId } }),
            error: 'Model not found'
          });
        }
        if (updateAssetDto.vendorId) {
          verifications.push({
            check: () => this.prisma.vendor.findUnique({ where: { id: updateAssetDto.vendorId } }),
            error: 'Vendor not found'
          });
        }

        for (const verification of verifications) {
          const result = await verification.check();
          if (!result) {
            throw new BadRequestException(verification.error);
          }
        }
      }

      const asset = await this.prisma.asset.update({
        where: { id },
        data: {
          ...updateAssetDto,
          purchaseDate: updateAssetDto.purchaseDate ? new Date(updateAssetDto.purchaseDate) : undefined,
          warrantyStartDate: updateAssetDto.warrantyStartDate ? new Date(updateAssetDto.warrantyStartDate) : undefined,
          warrantyEndDate: updateAssetDto.warrantyEndDate ? new Date(updateAssetDto.warrantyEndDate) : undefined,
          updatedBy: userId,
        },
        include: {
          assetType: {
            select: { 
              id: true, 
              name: true,
              category: { select: { id: true, name: true } }
            }
          },
          brand: { select: { id: true, name: true } },
          model: { select: { id: true, name: true } },
          vendor: { select: { id: true, name: true } },
          createdByUser: { select: { id: true, username: true } },
          updatedByUser: { select: { id: true, username: true } },
          _count: { select: { assetIssues: true } }
        },
      });

      return {
        message: 'Asset updated successfully',
        data: { asset },
      };
    } catch (error) {
      if (error.code === 'P2002') {
        if (error.meta?.target?.includes('assetId')) {
          throw new ConflictException('Asset ID already exists');
        }
        if (error.meta?.target?.includes('serialNumber')) {
          throw new ConflictException('Serial number already exists');
        }
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Asset not found');
      }
      throw error;
    }
  }

  async remove(id: number) {
    try {
      // Check if asset has active issues
      const assetWithIssues = await this.prisma.asset.findUnique({
        where: { id },
        include: {
          assetIssues: {
            where: { returnDate: null },
            select: { id: true }
          },
          _count: { 
            select: { 
              assetIssues: true,
              maintenanceSchedules: true
            } 
          }
        }
      });

      if (!assetWithIssues) {
        throw new NotFoundException('Asset not found');
      }

      if (assetWithIssues.assetIssues.length > 0) {
        throw new BadRequestException(
          'Cannot delete asset with active assignments. Please return the asset first.'
        );
      }

      if (assetWithIssues._count.maintenanceSchedules > 0) {
        throw new BadRequestException(
          'Cannot delete asset with maintenance schedules. Please remove maintenance schedules first.'
        );
      }

      await this.prisma.asset.delete({
        where: { id },
      });

      return {
        message: 'Asset deleted successfully',
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Asset not found');
      }
      throw error;
    }
  }

  async getAssetStats() {
    const [totalAssets, available, assigned, inMaintenance, retired, lost] = await Promise.all([
      this.prisma.asset.count(),
      this.prisma.asset.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.asset.count({ where: { status: 'ASSIGNED' } }),
      this.prisma.asset.count({ where: { status: 'IN_MAINTENANCE' } }),
      this.prisma.asset.count({ where: { status: 'RETIRED' } }),
      this.prisma.asset.count({ where: { status: 'LOST' } }),
    ]);

    return {
      message: 'Asset statistics retrieved successfully',
      data: {
        totalAssets,
        available,
        assigned,
        inMaintenance,
        retired,
        lost,
      },
    };
  }

  async findAvailableAssets(queryDto: AssetQueryDto) {
    const { page = 1, limit = 10, search, assetTypeId, brandId, modelId, condition, location, sortBy = 'assetId', sortOrder = 'asc' } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'AVAILABLE', // Only available assets
    };

    if (search) {
      where.OR = [
        { assetId: { contains: search, mode: 'insensitive' as const } },
        { serialNumber: { contains: search, mode: 'insensitive' as const } },
        { notes: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    if (assetTypeId) where.assetTypeId = assetTypeId;
    if (brandId) where.brandId = brandId;
    if (modelId) where.modelId = modelId;
    if (condition) where.condition = condition;
    if (location) where.location = { contains: location, mode: 'insensitive' as const };

    const orderBy = { [sortBy]: sortOrder } as any;

    const [assets, totalCount] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          assetType: {
            select: { 
              id: true, 
              name: true,
              category: { select: { id: true, name: true } }
            }
          },
          brand: { select: { id: true, name: true } },
          model: { select: { id: true, name: true, specifications: true } },
          vendor: { select: { id: true, name: true } },
        },
      }),
      this.prisma.asset.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      message: 'Available assets retrieved successfully',
      data: {
        assets,
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



  async searchAssets(queryDto: any) {
    const { q, page = 1, limit = 10, assetTypeId, brandId, status, condition } = queryDto;
    const skip = (page - 1) * limit;

    if (!q) {
      throw new BadRequestException('Search query (q) is required');
    }

    const where: any = {
      OR: [
        { assetId: { contains: q, mode: 'insensitive' as const } },
        { serialNumber: { contains: q, mode: 'insensitive' as const } },
        { notes: { contains: q, mode: 'insensitive' as const } },
        { location: { contains: q, mode: 'insensitive' as const } },
        { assetType: { name: { contains: q, mode: 'insensitive' as const } } },
        { brand: { name: { contains: q, mode: 'insensitive' as const } } },
        { model: { name: { contains: q, mode: 'insensitive' as const } } },
        { vendor: { name: { contains: q, mode: 'insensitive' as const } } },
      ],
    };

    // Apply additional filters
    if (assetTypeId) where.assetTypeId = parseInt(assetTypeId);
    if (brandId) where.brandId = parseInt(brandId);
    if (status) where.status = status;
    if (condition) where.condition = condition;

    const [assets, totalCount] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          assetType: {
            select: { 
              id: true, 
              name: true,
              category: { select: { id: true, name: true } }
            }
          },
          brand: { select: { id: true, name: true } },
          model: { select: { id: true, name: true } },
          vendor: { select: { id: true, name: true } },
        },
      }),
      this.prisma.asset.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      message: 'Search results retrieved successfully',
      data: {
        searchResults: assets,
        searchQuery: q,
        totalFound: totalCount,
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

  async getAssetsForDropdowns(query: any) {
    const { status = 'AVAILABLE', assetTypeId, brandId, modelId } = query;

    // Build where clause
    const where: any = {};

    // Default to AVAILABLE if no status specified
    if (status) {
      where.status = status;
    } else {
      where.status = 'AVAILABLE';
    }

    // Apply additional filters
    if (assetTypeId) where.assetTypeId = parseInt(assetTypeId);
    if (brandId) where.brandId = parseInt(brandId);
    if (modelId) where.modelId = parseInt(modelId);

    // Get all assets with minimal data for dropdowns
    const assets = await this.prisma.asset.findMany({
      where,
      select: {
        id: true,
        assetId: true,
        serialNumber: true,
        condition: true,
        status: true,
        location: true,
        assetType: {
          select: {
            id: true,
            name: true,
            category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        brand: {
          select: {
            id: true,
            name: true
          }
        },
        model: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        assetId: 'asc'
      }
    });

    return {
      message: 'Assets retrieved successfully',
      data: {
        assets
      }
    };
  }

  async bulkUpload(file: Express.Multer.File, userId: number, isValidateOnly: boolean = false) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const allowedMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only CSV and Excel files are allowed.');
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File size too large. Maximum size is 10MB.');
    }

    try {
      // Parse CSV/Excel file
      const csvData = file.buffer.toString('utf-8');
      const rows = csvData.split('\n').map(row => row.split(','));
      
      if (rows.length < 2) {
        throw new BadRequestException('File must contain at least a header row and one data row');
      }

      const headers = rows[0].map(h => h.trim().toLowerCase());
      const requiredHeaders = ['assetid', 'assettypeid', 'brandid', 'modelid'];
      
      // Validate required headers
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
      if (missingHeaders.length > 0) {
        throw new BadRequestException(`Missing required headers: ${missingHeaders.join(', ')}`);
      }

      const dataRows = rows.slice(1).filter(row => row.some(cell => cell.trim()));
      const errors: any[] = [];
      const validAssets: any[] = [];

      // Process each row
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNumber = i + 2; // +2 because we start from row 2 (after header)

        try {
          const assetData: any = {};
          
          // Map CSV columns to asset fields
          headers.forEach((header, index) => {
            const value = row[index]?.trim();
            if (value) {
              switch (header) {
                case 'assetid':
                  assetData.assetId = value;
                  break;
                case 'assettypeid':
                  assetData.assetTypeId = parseInt(value);
                  break;
                case 'brandid':
                  assetData.brandId = parseInt(value);
                  break;
                case 'modelid':
                  assetData.modelId = parseInt(value);
                  break;
                case 'serialnumber':
                  assetData.serialNumber = value;
                  break;
                case 'condition':
                  assetData.condition = value.toUpperCase();
                  break;
                case 'status':
                  assetData.status = value.toUpperCase();
                  break;
                case 'location':
                  assetData.location = value;
                  break;
                case 'notes':
                  assetData.notes = value;
                  break;
                case 'purchasedate':
                  assetData.purchaseDate = value;
                  break;
                case 'purchasecost':
                  assetData.purchaseCost = parseFloat(value);
                  break;
                case 'vendorid':
                  assetData.vendorId = parseInt(value);
                  break;
              }
            }
          });

          // Validate required fields
          if (!assetData.assetId || !assetData.assetTypeId || !assetData.brandId || !assetData.modelId) {
            errors.push({
              row: rowNumber,
              field: 'required_fields',
              message: 'Missing required fields: assetId, assetTypeId, brandId, or modelId'
            });
            continue;
          }

          // Validate foreign keys exist (basic validation)
          if (isNaN(assetData.assetTypeId) || isNaN(assetData.brandId) || isNaN(assetData.modelId)) {
            errors.push({
              row: rowNumber,
              field: 'invalid_ids',
              message: 'AssetTypeId, BrandId, and ModelId must be valid numbers'
            });
            continue;
          }

          validAssets.push({
            ...assetData,
            createdBy: userId,
            updatedBy: userId,
            rowNumber
          });

        } catch (error) {
          errors.push({
            row: rowNumber,
            field: 'parsing_error',
            message: `Error parsing row: ${error.message}`
          });
        }
      }

      // If validation only, return results without importing
      if (isValidateOnly) {
        return {
          message: 'File validation completed',
          data: {
            imported: 0,
            errors,
            summary: {
              totalRows: dataRows.length,
              validRows: validAssets.length,
              invalidRows: errors.length,
              validationOnly: true
            }
          }
        };
      }

      // Import valid assets
      let imported = 0;
      for (const assetData of validAssets) {
        try {
          const { rowNumber, ...createData } = assetData;
          
          // Verify foreign keys exist
          const [assetType, brand, model, vendor] = await Promise.all([
            this.prisma.assetType.findUnique({ where: { id: createData.assetTypeId } }),
            this.prisma.brand.findUnique({ where: { id: createData.brandId } }),
            this.prisma.model.findUnique({ where: { id: createData.modelId } }),
            createData.vendorId 
              ? this.prisma.vendor.findUnique({ where: { id: createData.vendorId } })
              : Promise.resolve(null),
          ]);

          if (!assetType) {
            errors.push({
              row: rowNumber,
              field: 'assetTypeId',
              message: 'Asset type not found'
            });
            continue;
          }
          if (!brand) {
            errors.push({
              row: rowNumber,
              field: 'brandId',
              message: 'Brand not found'
            });
            continue;
          }
          if (!model) {
            errors.push({
              row: rowNumber,
              field: 'modelId',
              message: 'Model not found'
            });
            continue;
          }
          if (createData.vendorId && !vendor) {
            errors.push({
              row: rowNumber,
              field: 'vendorId',
              message: 'Vendor not found'
            });
            continue;
          }

          // Create asset
          await this.prisma.asset.create({
            data: {
              ...createData,
              purchaseDate: createData.purchaseDate ? new Date(createData.purchaseDate) : null,
            }
          });

          imported++;
        } catch (error) {
          errors.push({
            row: assetData.rowNumber,
            field: 'database_error',
            message: error.message
          });
        }
      }

      return {
        message: 'Assets uploaded successfully',
        data: {
          imported,
          errors,
          summary: {
            totalRows: dataRows.length,
            successfulImports: imported,
            failedImports: errors.length,
            validationErrors: errors.length
          }
        }
      };

    } catch (error) {
      throw new BadRequestException(`Error processing file: ${error.message}`);
    }
  }
} 
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AssetIdService } from './asset-id.service';
import { AssetAuditService } from './asset-audit.service';
import { CreateAssetDto, UpdateAssetDto, AssetQueryDto, RetireAssetDto, ReactivateAssetDto } from './dto';

@Injectable()
export class AssetsService {
  constructor(
    private prisma: PrismaService,
    private assetIdService: AssetIdService,
    private assetAuditService: AssetAuditService
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

      // Get the current asset data before updating
      const currentAsset = await this.prisma.asset.findUnique({
        where: { id },
        select: {
          status: true,
          condition: true,
          location: true,
          assetId: true,
          serialNumber: true,
          purchaseDate: true,
          purchaseCost: true,
          warrantyStartDate: true,
          warrantyEndDate: true,
          notes: true,
          assetIssues: {
            select: {
              returnDate: true
            }
          }
        }
      });

      if (!currentAsset) {
        throw new NotFoundException('Asset not found');
      }

      // Validate condition: if asset has been returned from any employee, condition cannot be set to NEW
      if (updateAssetDto.condition && updateAssetDto.condition === 'NEW') {
        const hasReturnedAssignments = currentAsset.assetIssues.some(issue => issue.returnDate !== null);
        if (hasReturnedAssignments) {
          throw new BadRequestException('Asset condition cannot be set to NEW if the asset has been returned from any employee. Please choose GOOD, FAIR, POOR, DAMAGED, or REFURBISHED.');
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

      // Log audit changes
      await this.logAssetChanges(id, currentAsset, updateAssetDto, userId);

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

  /**
   * Log asset changes for audit trail
   */
  private async logAssetChanges(
    assetId: number,
    currentAsset: any,
    updateData: UpdateAssetDto,
    userId: number
  ): Promise<void> {
    const changes: any[] = [];

    // Check for status changes
    if (updateData.status && updateData.status !== currentAsset.status) {
      changes.push({
        fieldName: 'status',
        oldValue: currentAsset.status,
        newValue: updateData.status,
        changeType: 'STATUS_CHANGE',
        changedBy: userId,
      });
    }

    // Check for condition changes
    if (updateData.condition && updateData.condition !== currentAsset.condition) {
      changes.push({
        fieldName: 'condition',
        oldValue: currentAsset.condition,
        newValue: updateData.condition,
        changeType: 'CONDITION_CHANGE',
        changedBy: userId,
      });
    }

    // Check for location changes
    if (updateData.location !== undefined && updateData.location !== currentAsset.location) {
      changes.push({
        fieldName: 'location',
        oldValue: currentAsset.location,
        newValue: updateData.location,
        changeType: 'LOCATION_CHANGE',
        changedBy: userId,
      });
    }

    // Check for other field changes
    const fieldsToTrack = [
      'assetId', 'serialNumber', 'purchaseDate', 'purchaseCost',
      'warrantyStartDate', 'warrantyEndDate', 'notes'
    ];

    for (const field of fieldsToTrack) {
      if (updateData[field] !== undefined && updateData[field] !== currentAsset[field]) {
        changes.push({
          fieldName: field,
          oldValue: currentAsset[field]?.toString() || null,
          newValue: updateData[field]?.toString() || null,
          changeType: 'FIELD_UPDATE',
          changedBy: userId,
        });
      }
    }

    // Log all changes
    if (changes.length > 0) {
      await this.assetAuditService.logAssetChanges(assetId, changes);
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

  async validateBulkUpload(file: Express.Multer.File, userId: number) {
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
      let rows: string[][];
      
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        // Handle CSV files
        const csvData = file.buffer.toString('utf-8');
        rows = csvData.split('\n').map(row => row.split(','));
      } else {
        // Handle Excel files
        const XLSX = require('xlsx');
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const csvData = XLSX.utils.sheet_to_csv(worksheet);
        rows = csvData.split('\n').map(row => row.split(','));
      }
      
      if (rows.length < 2) {
        throw new BadRequestException('File must contain at least a header row and one data row');
      }

      const headers = rows[0].map(h => h.trim().toLowerCase());
      const requiredHeaders = ['assetid', 'serialnumber', 'assettypeid', 'brandid', 'modelid', 'status', 'condition'];
      
      // Validate required headers
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
      if (missingHeaders.length > 0) {
        throw new BadRequestException(`Missing required headers: ${missingHeaders.join(', ')}`);
      }

      const dataRows = rows.slice(1).filter(row => row.some(cell => cell.trim()));
      const errors: any[] = [];
      const validRows: any[] = [];

      // Get existing data for validation
      const [existingAssets, assetTypes, brands, models, vendors] = await Promise.all([
        this.prisma.asset.findMany({
          select: { assetId: true, serialNumber: true }
        }),
        this.prisma.assetType.findMany({
          include: { models: { select: { id: true, name: true } } }
        }),
        this.prisma.brand.findMany({
          include: { models: { select: { id: true, name: true } } }
        }),
        this.prisma.model.findMany({
          select: { id: true, name: true, brandId: true, assetTypeId: true }
        }),
        this.prisma.vendor.findMany({
          select: { id: true, name: true }
        })
      ]);

      // Create lookup maps
      const existingAssetIds = new Set(existingAssets.map(a => a.assetId));
      const existingSerialNumbers = new Set(existingAssets.map(a => a.serialNumber).filter(s => s));
      const assetTypeMap = new Map(assetTypes.map(at => [at.id, at]));
      const brandMap = new Map(brands.map(b => [b.id, b]));
      const modelMap = new Map(models.map(m => [m.id, m]));
      const vendorMap = new Map(vendors.map(v => [v.id, v]));

      // Valid enum values - Only AVAILABLE status allowed for bulk uploads
      const validStatuses = ['AVAILABLE'];
      const validConditions = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED', 'REFURBISHED'];

      // Track duplicates within the file
      const fileAssetIds = new Set();
      const fileSerialNumbers = new Set();

      // Process each row
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNumber = i + 2; // +2 because we start from row 2 (after header)
        const rowErrors: string[] = [];

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
                case 'serialnumber':
                  assetData.serialNumber = value;
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
                case 'vendorid':
                  assetData.vendorId = parseInt(value);
                  break;
                case 'status':
                  assetData.status = value.toUpperCase();
                  break;
                case 'condition':
                  assetData.condition = value.toUpperCase();
                  break;
                case 'location':
                  assetData.location = value;
                  break;
                case 'purchasedate':
                  assetData.purchaseDate = value;
                  break;
                case 'purchasecost':
                  assetData.purchaseCost = parseFloat(value);
                  break;
                case 'warrantystartdate':
                  assetData.warrantyStartDate = value;
                  break;
                case 'warrantyenddate':
                  assetData.warrantyEndDate = value;
                  break;
                case 'notes':
                  assetData.notes = value;
                  break;
              }
            }
          });

          // 1. Asset ID validation
          if (!assetData.assetId) {
            rowErrors.push('Asset ID is required');
          } else {
            // Format validation
            if (!/^AST-\d{4}$/.test(assetData.assetId)) {
              rowErrors.push(`Asset ID format invalid. Expected: AST-XXXX (4 digits), got: ${assetData.assetId}`);
            }
            // Check for duplicates within file
            if (fileAssetIds.has(assetData.assetId)) {
              rowErrors.push(`Asset ID '${assetData.assetId}' is duplicated within the file`);
            } else {
              fileAssetIds.add(assetData.assetId);
            }
            // Uniqueness validation against database
            if (existingAssetIds.has(assetData.assetId)) {
              rowErrors.push(`Asset ID '${assetData.assetId}' already exists in database`);
            }
          }

          // 2. Serial Number validation
          if (!assetData.serialNumber) {
            rowErrors.push('Serial number is required');
          } else {
            // Length validation
            if (assetData.serialNumber.length < 3 || assetData.serialNumber.length > 50) {
              rowErrors.push(`Serial number must be 3-50 characters, got: ${assetData.serialNumber.length} characters`);
            }
            // Format validation
            if (!/^[A-Za-z0-9\-_]{3,50}$/.test(assetData.serialNumber)) {
              rowErrors.push(`Serial number must contain only letters, numbers, hyphens, and underscores, got: ${assetData.serialNumber}`);
            }
            // Check for duplicates within file
            if (fileSerialNumbers.has(assetData.serialNumber)) {
              rowErrors.push(`Serial number '${assetData.serialNumber}' is duplicated within the file`);
            } else {
              fileSerialNumbers.add(assetData.serialNumber);
            }
            // Uniqueness validation against database
            if (existingSerialNumbers.has(assetData.serialNumber)) {
              rowErrors.push(`Serial number '${assetData.serialNumber}' already exists in database`);
            }
          }

          // 3. Asset Type ID validation
          if (!assetData.assetTypeId) {
            rowErrors.push('Asset Type ID is required');
          } else if (isNaN(assetData.assetTypeId)) {
            rowErrors.push(`Asset Type ID must be a valid number, got: ${assetData.assetTypeId}`);
          } else if (!assetTypeMap.has(assetData.assetTypeId)) {
            rowErrors.push(`Asset Type ID ${assetData.assetTypeId} does not exist in database`);
          }

          // 4. Brand ID validation
          if (!assetData.brandId) {
            rowErrors.push('Brand ID is required');
          } else if (isNaN(assetData.brandId)) {
            rowErrors.push(`Brand ID must be a valid number, got: ${assetData.brandId}`);
          } else if (!brandMap.has(assetData.brandId)) {
            rowErrors.push(`Brand ID ${assetData.brandId} does not exist in database`);
          }

          // 5. Model ID validation
          if (!assetData.modelId) {
            rowErrors.push('Model ID is required');
          } else if (isNaN(assetData.modelId)) {
            rowErrors.push(`Model ID must be a valid number, got: ${assetData.modelId}`);
          } else if (!modelMap.has(assetData.modelId)) {
            rowErrors.push(`Model ID ${assetData.modelId} does not exist in database`);
          } else {
            // Check model belongs to specified brand and asset type
            const model = modelMap.get(assetData.modelId);
            if (model) {
              if (model.brandId !== assetData.brandId) {
                rowErrors.push(`Model ID ${assetData.modelId} does not belong to Brand ID ${assetData.brandId} (foreign key relationship error)`);
              }
              if (model.assetTypeId !== assetData.assetTypeId) {
                rowErrors.push(`Model ID ${assetData.modelId} does not belong to Asset Type ID ${assetData.assetTypeId} (foreign key relationship error)`);
              }
            }
          }

          // 6. Vendor ID validation (optional)
          if (assetData.vendorId && !isNaN(assetData.vendorId)) {
            if (!vendorMap.has(assetData.vendorId)) {
              rowErrors.push(`Vendor ID ${assetData.vendorId} does not exist in database`);
            }
          }

          // 7. Status validation
          if (!assetData.status) {
            rowErrors.push('Status is required');
          } else if (!validStatuses.includes(assetData.status)) {
            rowErrors.push(`Status value '${assetData.status}' is not valid. Must be one of: ${validStatuses.join(', ')}`);
          }

          // 8. Condition validation
          if (!assetData.condition) {
            rowErrors.push('Condition is required');
          } else if (!validConditions.includes(assetData.condition)) {
            rowErrors.push(`Condition value '${assetData.condition}' is not valid. Must be one of: ${validConditions.join(', ')}`);
          }

          // 9. Location validation
          if (assetData.location) {
            if (assetData.location.length < 2 || assetData.location.length > 100) {
              rowErrors.push(`Location must be 2-100 characters, got: ${assetData.location.length} characters`);
            }
          }

          // 10. Purchase Date validation
          if (assetData.purchaseDate) {
            // Check DD-MM-YYYY format
            if (!/^\d{2}-\d{2}-\d{4}$/.test(assetData.purchaseDate)) {
              rowErrors.push(`Purchase date must be in DD-MM-YYYY format, got: ${assetData.purchaseDate}`);
            } else {
              // Check if date is valid and not in future
              const [day, month, year] = assetData.purchaseDate.split('-').map(Number);
              const date = new Date(year, month - 1, day);
              if (isNaN(date.getTime())) {
                rowErrors.push(`Invalid purchase date: ${assetData.purchaseDate}`);
              } else if (date > new Date()) {
                rowErrors.push(`Purchase date cannot be in the future: ${assetData.purchaseDate}`);
              }
            }
          }

          // 11. Purchase Cost validation
          if (assetData.purchaseCost !== undefined && assetData.purchaseCost !== null) {
            if (isNaN(assetData.purchaseCost)) {
              rowErrors.push(`Purchase cost must be a valid number, got: ${assetData.purchaseCost}`);
            } else if (assetData.purchaseCost < 0) {
              rowErrors.push(`Purchase cost cannot be negative, got: ${assetData.purchaseCost}`);
            } else if (assetData.purchaseCost > 1000000) {
              rowErrors.push(`Purchase cost cannot exceed ₹10,00,000, got: ${assetData.purchaseCost}`);
            }
          }

          // 12. Warranty Start Date validation
          if (assetData.warrantyStartDate) {
            if (!/^\d{2}-\d{2}-\d{4}$/.test(assetData.warrantyStartDate)) {
              rowErrors.push(`Warranty start date must be in DD-MM-YYYY format, got: ${assetData.warrantyStartDate}`);
            } else {
              const [day, month, year] = assetData.warrantyStartDate.split('-').map(Number);
              const date = new Date(year, month - 1, day);
              if (isNaN(date.getTime())) {
                rowErrors.push(`Invalid warranty start date: ${assetData.warrantyStartDate}`);
              }
            }
          }

          // 13. Warranty End Date validation
          if (assetData.warrantyEndDate) {
            if (!/^\d{2}-\d{2}-\d{4}$/.test(assetData.warrantyEndDate)) {
              rowErrors.push(`Warranty end date must be in DD-MM-YYYY format, got: ${assetData.warrantyEndDate}`);
            } else {
              const [day, month, year] = assetData.warrantyEndDate.split('-').map(Number);
              const date = new Date(year, month - 1, day);
              if (isNaN(date.getTime())) {
                rowErrors.push(`Invalid warranty end date: ${assetData.warrantyEndDate}`);
              } else if (assetData.warrantyStartDate) {
                const [startDay, startMonth, startYear] = assetData.warrantyStartDate.split('-').map(Number);
                const startDate = new Date(startYear, startMonth - 1, startDay);
                if (date <= startDate) {
                  rowErrors.push(`Warranty end date must be after warranty start date`);
                }
              }
            }
          }

          // 14. Notes validation
          if (assetData.notes && assetData.notes.length > 1000) {
            rowErrors.push(`Notes cannot exceed 1000 characters, got: ${assetData.notes.length} characters`);
          }

          if (rowErrors.length > 0) {
            // Add individual error messages for better readability
            rowErrors.forEach(errorMsg => {
              errors.push({
                row: rowNumber,
                field: 'validation',
                message: errorMsg,
                value: JSON.stringify(assetData)
              });
            });
          } else {
            validRows.push({ rowNumber, assetData });
          }

        } catch (error) {
          errors.push({
            row: rowNumber,
            field: 'parsing_error',
            message: `Error parsing row: ${error.message}`,
            value: row.join(', ')
          });
        }
      }

      return {
        message: 'File validation completed',
        data: {
          totalRows: dataRows.length,
          validRows: validRows.length,
          invalidRows: errors.length,
          errors,
          validationOnly: true
        }
      };

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Validation failed: ${error.message}`);
    }
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
      let rows: string[][];
      
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        // Handle CSV files
        const csvData = file.buffer.toString('utf-8');
        rows = csvData.split('\n').map(row => row.split(','));
      } else {
        // Handle Excel files
        const XLSX = require('xlsx');
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const csvData = XLSX.utils.sheet_to_csv(worksheet);
        rows = csvData.split('\n').map(row => row.split(','));
      }
      
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

          // Validate status - Only AVAILABLE allowed for bulk uploads
          if (assetData.status && assetData.status !== 'AVAILABLE') {
            errors.push({
              row: rowNumber,
              field: 'status',
              message: `Status value '${assetData.status}' is not valid. Only 'AVAILABLE' status is allowed for bulk uploads`
            });
            continue;
          }

          // Set default status to AVAILABLE if not provided
          if (!assetData.status) {
            assetData.status = 'AVAILABLE';
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

  /**
   * Retire an asset with proper audit logging
   */
  async retireAsset(assetId: number, retireAssetDto: RetireAssetDto, userId: number) {
    try {
      // Find the asset first
      const asset = await this.prisma.asset.findUnique({
        where: { id: assetId },
        include: {
          assetType: { select: { name: true } },
          brand: { select: { name: true } },
          model: { select: { name: true } }
        }
      });

      if (!asset) {
        throw new NotFoundException('Asset not found');
      }

      // Check if asset is already retired
      if (asset.status === 'RETIRED') {
        throw new BadRequestException('Asset is already retired');
      }

      // Check if asset is currently assigned
      if (asset.status === 'ASSIGNED') {
        throw new BadRequestException('Cannot retire an asset that is currently assigned to an employee');
      }

      // Check if asset is in maintenance
      if (asset.status === 'IN_MAINTENANCE') {
        throw new BadRequestException('Cannot retire an asset that is currently in maintenance');
      }

      // Update the asset with retirement information
      const updatedAsset = await this.prisma.asset.update({
        where: { id: assetId },
        data: {
          status: 'RETIRED',
          retirementDate: new Date(retireAssetDto.retirementDate),
          retirementReason: retireAssetDto.retirementReason,
          retirementNotes: retireAssetDto.retirementNotes || null,
          updatedBy: userId,
          updatedAt: new Date()
        },
        include: {
          assetType: { select: { name: true } },
          brand: { select: { name: true } },
          model: { select: { name: true } }
        }
      });

      // Log the retirement in audit trail
      await this.assetAuditService.logRetirement(
        assetId,
        retireAssetDto.retirementReason,
        userId
      );

      return {
        message: 'Asset retired successfully',
        data: {
          asset: {
            id: updatedAsset.id,
            assetId: updatedAsset.assetId,
            status: updatedAsset.status,
            retirementDate: updatedAsset.retirementDate,
            retirementReason: updatedAsset.retirementReason,
            assetType: updatedAsset.assetType.name,
            brand: updatedAsset.brand.name,
            model: updatedAsset.model.name
          }
        }
      };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Error retiring asset: ${error.message}`);
    }
  }

  async reactivateAsset(assetId: number, reactivateAssetDto: ReactivateAssetDto, userId: number) {
    try {
      // Find the asset first
      const asset = await this.prisma.asset.findUnique({
        where: { id: assetId },
        include: {
          assetType: { select: { name: true } },
          brand: { select: { name: true } },
          model: { select: { name: true } }
        }
      });

      if (!asset) {
        throw new NotFoundException('Asset not found');
      }

      // Check if asset is currently retired
      if (asset.status !== 'RETIRED') {
        throw new BadRequestException('Only retired assets can be reactivated');
      }

      // Update the asset with reactivation information
      const updatedAsset = await this.prisma.asset.update({
        where: { id: assetId },
        data: {
          status: reactivateAssetDto.status as any,
          condition: reactivateAssetDto.condition as any,
          location: reactivateAssetDto.location,
          reactivationDate: new Date(reactivateAssetDto.reactivationDate),
          reactivationReason: reactivateAssetDto.reactivationReason,
          updatedBy: userId,
          updatedAt: new Date()
        },
        include: {
          assetType: { select: { name: true } },
          brand: { select: { name: true } },
          model: { select: { name: true } }
        }
      });

      // Log the reactivation in audit trail
      await this.assetAuditService.logReactivation(
        assetId,
        reactivateAssetDto.reactivationReason,
        userId
      );

      return {
        message: 'Asset reactivated successfully',
        data: {
          asset: {
            id: updatedAsset.id,
            assetId: updatedAsset.assetId,
            status: updatedAsset.status,
            condition: updatedAsset.condition,
            location: updatedAsset.location,
            reactivationDate: updatedAsset.reactivationDate,
            reactivationReason: updatedAsset.reactivationReason,
            assetType: updatedAsset.assetType.name,
            brand: updatedAsset.brand.name,
            model: updatedAsset.model.name
          }
        }
      };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Error reactivating asset: ${error.message}`);
    }
  }

  async exportAssets(queryDto: AssetQueryDto) {
    try {
      const XLSX = require('xlsx');
      
      // Get all assets with the same filtering logic as findAll
      const { status, assetTypeId, brandId, modelId, search, condition, location, sortBy = 'assetId', sortOrder = 'asc' } = queryDto;
      
      console.log('Export query params:', { status, assetTypeId, brandId, modelId, search, condition, location, sortBy, sortOrder });
      
      // Build where clause
      const where: any = {};
      
      if (status) {
        where.status = status;
      }
      
      if (assetTypeId) {
        where.assetTypeId = typeof assetTypeId === 'string' ? parseInt(assetTypeId) : assetTypeId;
      }
      
      if (brandId) {
        where.brandId = typeof brandId === 'string' ? parseInt(brandId) : brandId;
      }
      
      if (modelId) {
        where.modelId = typeof modelId === 'string' ? parseInt(modelId) : modelId;
      }
      
      if (condition) {
        where.condition = condition;
      }
      
      if (location) {
        where.location = {
          contains: location,
          mode: 'insensitive'
        };
      }
      
      if (search) {
        where.OR = [
          { assetId: { contains: search, mode: 'insensitive' } },
          { serialNumber: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Build orderBy clause
      const orderBy: any = {};
      switch (sortBy) {
        case 'assetId':
          orderBy.assetId = sortOrder;
          break;
        case 'status':
          orderBy.status = sortOrder;
          break;
        case 'condition':
          orderBy.condition = sortOrder;
          break;
        case 'purchaseDate':
          orderBy.purchaseDate = sortOrder;
          break;
        case 'createdAt':
          orderBy.createdAt = sortOrder;
          break;
        case 'updatedAt':
          orderBy.updatedAt = sortOrder;
          break;
        default:
          orderBy.assetId = 'asc';
      }

      // Get all assets with related data
      const assets = await this.prisma.asset.findMany({
        where,
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
                  lastName: true
                }
              }
            }
          }
        },
        orderBy
      });

      // Prepare data for Excel export
      const exportData = assets.map(asset => ({
        'Asset ID': asset.assetId,
        'Serial Number': asset.serialNumber || '',
        'Category': asset.assetType?.category?.name || '',
        'Asset Type': asset.assetType?.name || '',
        'Brand': asset.brand?.name || '',
        'Model': asset.model?.name || '',
        'Vendor': asset.vendor?.name || '',
        'Status': asset.status,
        'Condition': asset.condition,
        'Location': asset.location || '',
        'Assigned To': asset.assetIssues && asset.assetIssues.length > 0 ? 
          `${asset.assetIssues[0].employee.firstName} ${asset.assetIssues[0].employee.lastName} (${asset.assetIssues[0].employee.employeeId})` : 
          'Unassigned',
        'Purchase Date': asset.purchaseDate ? 
          new Date(asset.purchaseDate).toLocaleDateString('en-GB') : '',
        'Purchase Cost': asset.purchaseCost ? `₹${asset.purchaseCost.toLocaleString()}` : '',
        'Warranty Start': asset.warrantyStartDate ? 
          new Date(asset.warrantyStartDate).toLocaleDateString('en-GB') : '',
        'Warranty End': asset.warrantyEndDate ? 
          new Date(asset.warrantyEndDate).toLocaleDateString('en-GB') : '',
        'Notes': asset.notes || '',
        'Retirement Date': asset.retirementDate ? 
          new Date(asset.retirementDate).toLocaleDateString('en-GB') : '',
        'Retirement Reason': asset.retirementReason || '',
        'Reactivation Date': asset.reactivationDate ? 
          new Date(asset.reactivationDate).toLocaleDateString('en-GB') : '',
        'Reactivation Reason': asset.reactivationReason || '',
        'Created By': asset.createdByUser?.username || '',
        'Created At': asset.createdAt ? 
          new Date(asset.createdAt).toLocaleString('en-GB') : '',
        'Updated By': asset.updatedByUser?.username || '',
        'Updated At': asset.updatedAt ? 
          new Date(asset.updatedAt).toLocaleString('en-GB') : ''
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Set column widths for better readability
      const columnWidths = [
        { wch: 12 }, // Asset ID
        { wch: 15 }, // Serial Number
        { wch: 15 }, // Category
        { wch: 15 }, // Asset Type
        { wch: 12 }, // Brand
        { wch: 15 }, // Model
        { wch: 15 }, // Vendor
        { wch: 12 }, // Status
        { wch: 12 }, // Condition
        { wch: 20 }, // Location
        { wch: 25 }, // Assigned To
        { wch: 12 }, // Purchase Date
        { wch: 15 }, // Purchase Cost
        { wch: 12 }, // Warranty Start
        { wch: 12 }, // Warranty End
        { wch: 30 }, // Notes
        { wch: 12 }, // Retirement Date
        { wch: 20 }, // Retirement Reason
        { wch: 12 }, // Reactivation Date
        { wch: 20 }, // Reactivation Reason
        { wch: 15 }, // Created By
        { wch: 20 }, // Created At
        { wch: 15 }, // Updated By
        { wch: 20 }  // Updated At
      ];
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');

      // Generate Excel file buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `assets_export_${timestamp}.xlsx`;

      return {
        message: 'Assets exported successfully',
        data: {
          filename,
          buffer: excelBuffer,
          count: assets.length
        }
      };

    } catch (error) {
      throw new BadRequestException(`Export failed: ${error.message}`);
    }
  }
} 
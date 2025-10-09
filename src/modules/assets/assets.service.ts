import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AssetIdService } from './asset-id.service';
import {
  CreateAssetDto,
  UpdateAssetDto,
  AssetQueryDto,
  RetireAssetDto,
  ReactivateAssetDto,
} from './dto';
import { AssetEventType } from '@prisma/client';

/**
 * Validation context for bulk upload processing
 */
interface ValidationContext {
  fileAssetIds: Set<string>;
  fileSerialNumbers: Set<string>;
  existingAssetIds: Set<string>;
  existingSerialNumbers: Set<string>;
  assetTypeMap: Map<number, any>;
  brandMap: Map<number, any>;
  modelMap: Map<number, any>;
  vendorMap: Map<number, any>;
  validStatuses: string[];
  validConditions: string[];
}

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetIdService: AssetIdService,
  ) {}

  async checkSerialNumberUnique(serialNumber: string, excludeAssetId?: string) {
    if (!serialNumber?.trim()) {
      throw new BadRequestException('Serial number is required');
    }

    const trimmedSerialNumber = serialNumber.trim();
    console.log('🔍 Checking serial number uniqueness:', {
      original: serialNumber,
      trimmed: trimmedSerialNumber,
      excludeAssetId,
    });

    // Search for exact match, trimmed match, and also check for leading/trailing spaces
    const serialNumberConditions = [
      { serialNumber: { equals: trimmedSerialNumber, mode: 'insensitive' } },
      {
        serialNumber: {
          equals: ` ${trimmedSerialNumber}`,
          mode: 'insensitive',
        },
      }, // Leading space
      {
        serialNumber: {
          equals: `${trimmedSerialNumber} `,
          mode: 'insensitive',
        },
      }, // Trailing space
      {
        serialNumber: {
          equals: ` ${trimmedSerialNumber} `,
          mode: 'insensitive',
        },
      }, // Both spaces
    ];

    const where: any = {
      OR: serialNumberConditions,
    };

    // If excludeAssetId is provided (for edit mode), exclude that asset from the check
    if (excludeAssetId) {
      where.id = { not: Number.parseInt(excludeAssetId) };
    }

    const existingAsset = await this.prisma.asset.findFirst({
      where,
      select: { id: true, assetId: true, serialNumber: true },
    });

    console.log('🔍 Search result:', {
      found: !!existingAsset,
      existingAsset: existingAsset,
    });

    return {
      message: 'Serial number check completed',
      data: {
        isUnique: !existingAsset,
        serialNumber: trimmedSerialNumber,
        existingAsset: existingAsset
          ? {
              id: existingAsset.id,
              assetId: existingAsset.assetId,
              serialNumber: existingAsset.serialNumber,
            }
          : null,
      },
    };
  }

  /**
   * Validate and generate asset ID
   */
  private async validateAndGenerateAssetId(
    providedAssetId?: string,
  ): Promise<string> {
    if (!providedAssetId) {
      return await this.assetIdService.generateNextAssetId();
    }

    // Validate provided asset ID format
    if (!this.assetIdService.validateAssetIdFormat(providedAssetId)) {
      throw new BadRequestException(
        'Invalid asset ID format. Expected format: AST-XXXX',
      );
    }

    // Check if provided asset ID already exists
    if (await this.assetIdService.assetIdExists(providedAssetId)) {
      throw new ConflictException('Asset ID already exists');
    }

    return providedAssetId;
  }

  /**
   * Validate foreign key references
   */
  private async validateForeignKeys(
    createAssetDto: CreateAssetDto,
  ): Promise<{ assetType: any; brand: any; model: any; vendor: any }> {
    const [assetType, brand, model, vendor] = await Promise.all([
      this.prisma.assetType.findUnique({
        where: { id: createAssetDto.assetTypeId },
      }),
      this.prisma.brand.findUnique({ where: { id: createAssetDto.brandId } }),
      this.prisma.model.findUnique({ where: { id: createAssetDto.modelId } }),
      createAssetDto.vendorId
        ? this.prisma.vendor.findUnique({
            where: { id: createAssetDto.vendorId },
          })
        : Promise.resolve(null),
    ]);

    if (!assetType) throw new BadRequestException('Asset type not found');
    if (!brand) throw new BadRequestException('Brand not found');
    if (!model) throw new BadRequestException('Model not found');
    if (createAssetDto.vendorId && !vendor)
      throw new BadRequestException('Vendor not found');

    return { assetType, brand, model, vendor };
  }

  /**
   * Validate model relationships
   */
  private validateModelRelationships(
    model: any,
    createAssetDto: CreateAssetDto,
  ): void {
    if (model.brandId !== createAssetDto.brandId) {
      throw new BadRequestException(
        'Model does not belong to the specified brand',
      );
    }
    if (model.assetTypeId !== createAssetDto.assetTypeId) {
      throw new BadRequestException(
        'Model does not belong to the specified asset type',
      );
    }
  }

  /**
   * Create asset and log creation event
   */
  private async createAssetWithEvent(
    createAssetDto: CreateAssetDto,
    assetId: string,
    userId: number,
    assetType: any,
    brand: any,
    model: any,
    vendor: any,
  ): Promise<any> {
    const asset = await this.prisma.asset.create({
      data: {
        ...createAssetDto,
        assetId, // Use generated or validated asset ID
        serialNumber: createAssetDto.serialNumber
          ? createAssetDto.serialNumber.trim()
          : null, // Trim serial number
        status: createAssetDto.status || 'AVAILABLE', // Default to AVAILABLE if not provided
        condition: createAssetDto.condition || 'NEW', // Default to NEW if not provided
        purchaseDate: createAssetDto.purchaseDate
          ? new Date(createAssetDto.purchaseDate)
          : null,
        warrantyStartDate: createAssetDto.warrantyStartDate
          ? new Date(createAssetDto.warrantyStartDate)
          : null,
        warrantyEndDate: createAssetDto.warrantyEndDate
          ? new Date(createAssetDto.warrantyEndDate)
          : null,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        assetType: {
          select: {
            id: true,
            name: true,
            category: { select: { id: true, name: true } },
          },
        },
        brand: { select: { id: true, name: true } },
        model: { select: { id: true, name: true, specifications: true } },
        vendor: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, username: true } },
        _count: { select: { assetIssues: true } },
      },
    });

    // Log asset creation event
    await this.prisma.assetEvent.create({
      data: {
        assetId: asset.id,
        eventType: AssetEventType.ASSET_CREATED,
        eventDate: new Date(),
        performedBy: userId,
        metadata: {
          assetId: asset.assetId,
          assetType: assetType.name,
          brand: brand.name,
          model: model.name,
          serialNumber: asset.serialNumber,
          condition: asset.condition,
          status: asset.status,
          location: asset.location,
          purchaseCost: asset.purchaseCost,
          vendor: vendor?.name || null,
        },
      },
    });

    return asset;
  }

  /**
   * Handle database constraint errors
   */
  private handleDatabaseErrors(error: any): void {
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

  async create(createAssetDto: CreateAssetDto, userId: number) {
    try {
      // Generate or validate asset ID
      const assetId = await this.validateAndGenerateAssetId(
        createAssetDto.assetId,
      );

      // Validate foreign key references
      const { assetType, brand, model, vendor } =
        await this.validateForeignKeys(createAssetDto);

      // Validate model relationships
      this.validateModelRelationships(model, createAssetDto);

      // Create asset and log creation event
      const asset = await this.createAssetWithEvent(
        createAssetDto,
        assetId,
        userId,
        assetType,
        brand,
        model,
        vendor,
      );

      return {
        message: 'Asset created successfully',
        data: { asset },
      };
    } catch (error) {
      this.handleDatabaseErrors(error);
    }
  }

  async findAll(queryDto: AssetQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      assetTypeId,
      brandId,
      modelId,
      vendorId,
      status,
      condition,
      location,
      fromDate,
      toDate,
      assetType,
      assetStatus,
      sortBy = 'assetId',
      sortOrder = 'asc',
    } = queryDto;
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
    if (location)
      where.location = { contains: location, mode: 'insensitive' as const };

    // Handle string-based filters for custom reports
    if (assetType) {
      where.assetType = {
        name: { contains: assetType, mode: 'insensitive' as const },
      };
    }
    if (assetStatus) {
      where.status = assetStatus;
    }

    // Date range filter (createdAt)
    if (fromDate || toDate) {
      where.createdAt = {} as any;
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const orderBy = { [sortBy]: sortOrder } as any;

    const [assets, totalCount] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          assetId: true,
          serialNumber: true,
          condition: true,
          status: true,
          assetType: { select: { name: true } },
          brand: { select: { name: true } },
          model: { select: { name: true } },
          assetIssues: {
            where: { returnDate: null }, // Only current assignments
            select: {
              employee: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
            take: 1, // Only get the current assignment
          },
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
      select: {
        id: true,
        assetId: true,
        serialNumber: true,
        condition: true,
        status: true,
        location: true,
        notes: true,
        purchaseDate: true,
        purchaseCost: true,
        warrantyStartDate: true,
        warrantyEndDate: true,
        retirementDate: true,
        retirementReason: true,
        retirementNotes: true,
        reactivationDate: true,
        reactivationReason: true,
        assetTypeId: true,
        brandId: true,
        modelId: true,
        vendorId: true,
        assetType: {
          select: {
            id: true,
            name: true,
            category: { select: { id: true, name: true } },
          },
        },
        brand: {
          select: { id: true, name: true },
        },
        model: {
          select: { id: true, name: true, specifications: true },
        },
        vendor: {
          select: { id: true, name: true },
        },
        createdByUser: { select: { username: true } },
        updatedByUser: { select: { username: true } },
        assetIssues: {
          select: {
            id: true,
            issueDate: true,
            returnDate: true,
            issueReason: true,
            notes: true,
            employee: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            issuedByUser: {
              select: { username: true },
            },
          },
          orderBy: { issueDate: 'desc' },
          take: 1, // Only get the latest assignment
        },
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    // Transform the data to ensure purchaseCost is a number
    const transformedAsset = {
      ...asset,
      purchaseCost: asset.purchaseCost ? Number(asset.purchaseCost) : null,
    };

    return {
      message: 'Asset retrieved successfully',
      data: { asset: transformedAsset },
    };
  }

  /**
   * Validate asset ID for update operations
   */
  private async validateAssetIdForUpdate(
    assetId: string,
    currentAssetId: number,
  ): Promise<void> {
    if (!this.assetIdService.validateAssetIdFormat(assetId)) {
      throw new BadRequestException(
        'Invalid asset ID format. Expected format: AST-XXXX',
      );
    }

    // Check if provided asset ID already exists (excluding current asset)
    const existingAsset = await this.prisma.asset.findFirst({
      where: {
        assetId: assetId,
        id: { not: currentAssetId },
      },
    });

    if (existingAsset) {
      throw new ConflictException('Asset ID already exists');
    }
  }

  /**
   * Validate foreign key references for update operations
   */
  private async validateForeignKeysForUpdate(
    updateAssetDto: UpdateAssetDto,
  ): Promise<void> {
    if (
      !updateAssetDto.assetTypeId &&
      !updateAssetDto.brandId &&
      !updateAssetDto.modelId &&
      !updateAssetDto.vendorId
    ) {
      return; // No foreign keys to validate
    }

    const verifications: Array<{ check: () => Promise<any>; error: string }> =
      [];

    if (updateAssetDto.assetTypeId) {
      verifications.push({
        check: () =>
          this.prisma.assetType.findUnique({
            where: { id: updateAssetDto.assetTypeId },
          }),
        error: 'Asset type not found',
      });
    }
    if (updateAssetDto.brandId) {
      verifications.push({
        check: () =>
          this.prisma.brand.findUnique({
            where: { id: updateAssetDto.brandId },
          }),
        error: 'Brand not found',
      });
    }
    if (updateAssetDto.modelId) {
      verifications.push({
        check: () =>
          this.prisma.model.findUnique({
            where: { id: updateAssetDto.modelId },
          }),
        error: 'Model not found',
      });
    }
    if (updateAssetDto.vendorId) {
      verifications.push({
        check: () =>
          this.prisma.vendor.findUnique({
            where: { id: updateAssetDto.vendorId },
          }),
        error: 'Vendor not found',
      });
    }

    for (const verification of verifications) {
      const result = await verification.check();
      if (!result) {
        throw new BadRequestException(verification.error);
      }
    }
  }

  /**
   * Get current asset data for update operations
   */
  private async getCurrentAssetForUpdate(id: number): Promise<any> {
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
        vendorId: true,
        brandId: true,
        modelId: true,
        assetTypeId: true,
        vendor: { select: { name: true } },
        brand: { select: { name: true } },
        model: { select: { name: true } },
        assetType: { select: { name: true } },
        assetIssues: {
          select: {
            returnDate: true,
          },
        },
      },
    });

    if (!currentAsset) {
      throw new NotFoundException('Asset not found');
    }

    return currentAsset;
  }

  /**
   * Validate asset condition for update operations
   */
  private validateAssetCondition(
    updateAssetDto: UpdateAssetDto,
    currentAsset: any,
  ): void {
    if (updateAssetDto.condition && updateAssetDto.condition === 'NEW') {
      const hasReturnedAssignments = currentAsset.assetIssues.some(
        (issue) => issue.returnDate !== null,
      );
      if (hasReturnedAssignments) {
        throw new BadRequestException(
          'Asset condition cannot be set to NEW if the asset has been returned from any employee. Please choose GOOD, FAIR, POOR, DAMAGED, or REFURBISHED.',
        );
      }
    }
  }

  /**
   * Update asset and log changes
   */
  private async updateAssetWithLogging(
    id: number,
    updateAssetDto: UpdateAssetDto,
    userId: number,
    currentAsset: any,
  ): Promise<any> {
    const asset = await this.prisma.asset.update({
      where: { id },
      data: {
        ...updateAssetDto,
        serialNumber: updateAssetDto.serialNumber
          ? updateAssetDto.serialNumber.trim()
          : undefined, // Trim serial number
        purchaseDate: updateAssetDto.purchaseDate
          ? new Date(updateAssetDto.purchaseDate)
          : undefined,
        warrantyStartDate: updateAssetDto.warrantyStartDate
          ? new Date(updateAssetDto.warrantyStartDate)
          : undefined,
        warrantyEndDate: updateAssetDto.warrantyEndDate
          ? new Date(updateAssetDto.warrantyEndDate)
          : undefined,
        updatedBy: userId,
      },
      include: {
        assetType: {
          select: {
            id: true,
            name: true,
            category: { select: { id: true, name: true } },
          },
        },
        brand: { select: { id: true, name: true } },
        model: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, username: true } },
        updatedByUser: { select: { id: true, username: true } },
        _count: { select: { assetIssues: true } },
      },
    });

    // Log audit changes
    await this.logAssetChanges(id, currentAsset, updateAssetDto, userId);

    return asset;
  }

  /**
   * Handle update operation errors
   */
  private handleUpdateErrors(error: any): void {
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

  async update(id: number, updateAssetDto: UpdateAssetDto, userId: number) {
    try {
      // Validate assetId format if being updated
      if (updateAssetDto.assetId) {
        await this.validateAssetIdForUpdate(updateAssetDto.assetId, id);
      }

      // Validate foreign key references
      await this.validateForeignKeysForUpdate(updateAssetDto);

      // Get current asset data
      const currentAsset = await this.getCurrentAssetForUpdate(id);

      // Validate asset condition
      this.validateAssetCondition(updateAssetDto, currentAsset);

      // Update asset and log changes
      const asset = await this.updateAssetWithLogging(
        id,
        updateAssetDto,
        userId,
        currentAsset,
      );

      return {
        message: 'Asset updated successfully',
        data: { asset },
      };
    } catch (error) {
      this.handleUpdateErrors(error);
    }
  }

  /**
   * Detect basic field changes (status, condition, location)
   */
  private detectBasicFieldChanges(
    currentAsset: any,
    updateData: UpdateAssetDto,
    userId: number,
    changeReason?: string,
    notes?: string,
  ): any[] {
    const changes: any[] = [];

    // Check for status changes
    if (updateData.status && updateData.status !== currentAsset.status) {
      changes.push({
        fieldName: 'status',
        oldValue: currentAsset.status,
        newValue: updateData.status,
        changeType: 'STATUS_CHANGE' as any,
        changeReason,
        changedBy: userId,
        notes,
      });
    }

    // Check for condition changes
    if (
      updateData.condition &&
      updateData.condition !== currentAsset.condition
    ) {
      changes.push({
        fieldName: 'condition',
        oldValue: currentAsset.condition,
        newValue: updateData.condition,
        changeType: 'CONDITION_CHANGE' as any,
        changeReason,
        changedBy: userId,
        notes,
      });
    }

    // Check for location changes
    if (
      updateData.location !== undefined &&
      updateData.location !== currentAsset.location
    ) {
      changes.push({
        fieldName: 'location',
        oldValue: currentAsset.location,
        newValue: updateData.location,
        changeType: 'LOCATION_CHANGE' as any,
        changeReason,
        changedBy: userId,
        notes,
      });
    }

    return changes;
  }

  /**
   * Get old relation data for a field
   */
  private getOldRelationData(field: string, currentAsset: any): any {
    const relationMap = {
      vendorId: currentAsset.vendor?.name,
      brandId: currentAsset.brand?.name,
      modelId: currentAsset.model?.name,
      assetTypeId: currentAsset.assetType?.name,
    };
    return relationMap[field] || undefined;
  }

  /**
   * Get new relation ID for a field
   */
  private getNewRelationId(field: string, updateData: UpdateAssetDto): any {
    const relationFields = ['vendorId', 'brandId', 'modelId', 'assetTypeId'];
    return relationFields.includes(field) ? updateData[field] : undefined;
  }

  /**
   * Create change object for a field
   */
  private createFieldChange(options: {
    field: string;
    dbField: string;
    changeType: string;
    currentAsset: any;
    updateData: UpdateAssetDto;
    userId: number;
    changeReason?: string;
    notes?: string;
  }): any {
    return {
      fieldName: options.field,
      oldValue: this.formatValueForDisplay(
        options.currentAsset[options.dbField],
      ),
      newValue: this.formatValueForDisplay(options.updateData[options.field]),
      changeType: options.changeType as any,
      changeReason: options.changeReason,
      changedBy: options.userId,
      notes: options.notes,
      // Store relation data for later resolution
      oldVendor:
        options.field === 'vendorId'
          ? this.getOldRelationData('vendorId', options.currentAsset)
          : undefined,
      oldBrand:
        options.field === 'brandId'
          ? this.getOldRelationData('brandId', options.currentAsset)
          : undefined,
      oldModel:
        options.field === 'modelId'
          ? this.getOldRelationData('modelId', options.currentAsset)
          : undefined,
      oldAssetType:
        options.field === 'assetTypeId'
          ? this.getOldRelationData('assetTypeId', options.currentAsset)
          : undefined,
      newVendorId: this.getNewRelationId('vendorId', options.updateData),
      newBrandId: this.getNewRelationId('brandId', options.updateData),
      newModelId: this.getNewRelationId('modelId', options.updateData),
      newAssetTypeId: this.getNewRelationId('assetTypeId', options.updateData),
    };
  }

  /**
   * Detect relation field changes
   */
  private detectRelationFieldChanges(
    currentAsset: any,
    updateData: UpdateAssetDto,
    userId: number,
    changeReason?: string,
    notes?: string,
  ): any[] {
    const changes: any[] = [];
    const fieldsToTrack = [
      { field: 'assetId', dbField: 'assetId', changeType: 'ASSET_ID_CHANGE' },
      {
        field: 'serialNumber',
        dbField: 'serialNumber',
        changeType: 'SERIAL_NUMBER_CHANGE',
      },
      {
        field: 'purchaseDate',
        dbField: 'purchaseDate',
        changeType: 'PURCHASE_DATE_CHANGE',
      },
      {
        field: 'purchaseCost',
        dbField: 'purchaseCost',
        changeType: 'PURCHASE_COST_CHANGE',
      },
      {
        field: 'warrantyStartDate',
        dbField: 'warrantyStartDate',
        changeType: 'WARRANTY_START_CHANGE',
      },
      {
        field: 'warrantyEndDate',
        dbField: 'warrantyEndDate',
        changeType: 'WARRANTY_END_CHANGE',
      },
      { field: 'notes', dbField: 'notes', changeType: 'NOTES_CHANGE' },
      { field: 'vendorId', dbField: 'vendorId', changeType: 'VENDOR_CHANGE' },
      { field: 'brandId', dbField: 'brandId', changeType: 'BRAND_CHANGE' },
      { field: 'modelId', dbField: 'modelId', changeType: 'MODEL_CHANGE' },
      {
        field: 'assetTypeId',
        dbField: 'assetTypeId',
        changeType: 'ASSET_TYPE_CHANGE',
      },
      { field: 'qrCode', dbField: 'qrCode', changeType: 'QR_CODE_CHANGE' },
      { field: 'imageUrl', dbField: 'imageUrl', changeType: 'IMAGE_UPLOAD' },
    ];

    for (const { field, dbField, changeType } of fieldsToTrack) {
      if (
        updateData[field] !== undefined &&
        updateData[field] !== currentAsset[dbField]
      ) {
        changes.push(
          this.createFieldChange({
            field,
            dbField,
            changeType,
            currentAsset,
            updateData,
            userId,
            changeReason,
            notes,
          }),
        );
      }
    }

    return changes;
  }

  /**
   * Resolve relation names for changes
   */
  private async resolveChangeRelations(changes: any[]): Promise<any[]> {
    return await Promise.all(
      changes.map(async (change) => {
        let oldValue = change.oldValue;
        let newValue = change.newValue;

        // Use stored old names if available
        if (change.oldVendor) oldValue = change.oldVendor;
        if (change.oldBrand) oldValue = change.oldBrand;
        if (change.oldModel) oldValue = change.oldModel;
        if (change.oldAssetType) oldValue = change.oldAssetType;

        // Fetch new names for relation fields
        if (change.newVendorId) {
          const vendor = await this.prisma.vendor.findUnique({
            where: { id: change.newVendorId },
            select: { name: true },
          });
          newValue = vendor?.name || newValue;
        }
        if (change.newBrandId) {
          const brand = await this.prisma.brand.findUnique({
            where: { id: change.newBrandId },
            select: { name: true },
          });
          newValue = brand?.name || newValue;
        }
        if (change.newModelId) {
          const model = await this.prisma.model.findUnique({
            where: { id: change.newModelId },
            select: { name: true },
          });
          newValue = model?.name || newValue;
        }
        if (change.newAssetTypeId) {
          const assetType = await this.prisma.assetType.findUnique({
            where: { id: change.newAssetTypeId },
            select: { name: true },
          });
          newValue = assetType?.name || newValue;
        }

        return {
          fieldName: change.fieldName,
          oldValue,
          newValue,
        };
      }),
    );
  }

  /**
   * Create asset update event
   */
  private async createAssetUpdateEvent(
    assetId: number,
    userId: number,
    resolvedChanges: any[],
    changes: any[],
  ): Promise<void> {
    // Get asset details for metadata
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        assetType: { select: { name: true } },
        brand: { select: { name: true } },
        model: { select: { name: true } },
        vendor: { select: { name: true } },
      },
    });

    // Create a single ASSET_UPDATED event with all changes in metadata
    await this.prisma.assetEvent.create({
      data: {
        assetId: assetId,
        eventType: AssetEventType.ASSET_UPDATED,
        eventDate: new Date(),
        performedBy: userId,
        metadata: {
          changes: resolvedChanges,
          assetId: asset?.assetId,
          assetType: asset?.assetType?.name,
          brand: asset?.brand?.name,
          model: asset?.model?.name,
          vendor: asset?.vendor?.name,
          totalChanges: changes.length,
          updatedVia: 'EditAssetView',
        },
      },
    });
  }

  /**
   * Log asset changes for audit trail - now groups all changes into a single event
   */
  private async logAssetChanges(
    assetId: number,
    currentAsset: any,
    updateData: UpdateAssetDto,
    userId: number,
    changeReason?: string,
    notes?: string,
  ): Promise<void> {
    const changes: any[] = [];

    // Detect basic field changes and relation field changes
    changes.push(
      ...this.detectBasicFieldChanges(
        currentAsset,
        updateData,
        userId,
        changeReason,
        notes,
      ),
      ...this.detectRelationFieldChanges(
        currentAsset,
        updateData,
        userId,
        changeReason,
        notes,
      ),
    );

    // If we have changes, log them as a grouped event
    if (changes.length > 0) {
      // Resolve relation names for new IDs
      const resolvedChanges = await this.resolveChangeRelations(changes);

      // Create asset update event
      await this.createAssetUpdateEvent(
        assetId,
        userId,
        resolvedChanges,
        changes,
      );
    }
  }

  async remove(id: number) {
    try {
      // Check for asset deletion eligibility - only 3 criteria
      const assetWithChecks = await this.prisma.asset.findUnique({
        where: { id },
        include: {
          // Check for any assignment history (never been assigned)
          _count: {
            select: {
              assetIssues: true, // Any assignment history
              maintenanceSchedules: true, // Any maintenance history
            },
          },
        },
      });

      if (!assetWithChecks) {
        throw new NotFoundException('Asset not found');
      }

      // ✅ CRITERIA 1: Only AVAILABLE assets can be deleted
      if (assetWithChecks.status !== 'AVAILABLE') {
        throw new BadRequestException(
          `Cannot delete asset with status '${assetWithChecks.status}'. Only AVAILABLE assets can be deleted.`,
        );
      }

      // ✅ CRITERIA 2: Never been assigned to anyone (no assignment history)
      if (assetWithChecks._count.assetIssues > 0) {
        throw new BadRequestException(
          'Cannot delete asset that has been assigned. Only assets that have never been assigned can be deleted.',
        );
      }

      // ✅ CRITERIA 3: Never been in maintenance (no maintenance history)
      if (assetWithChecks._count.maintenanceSchedules > 0) {
        throw new BadRequestException(
          'Cannot delete asset that has been in maintenance. Only assets that have never been in maintenance can be deleted.',
        );
      }

      // All 3 criteria passed - safe to delete
      await this.prisma.asset.delete({
        where: { id },
      });

      return {
        message: 'Asset deleted successfully',
        details: {
          assetId: assetWithChecks.assetId,
          reason:
            'Asset met all deletion criteria: AVAILABLE status, never assigned, never maintained',
        },
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Asset not found');
      }
      throw error;
    }
  }

  async bulkDelete(assetIds: number[]) {
    const results: Array<{
      id: number;
      assetId: string | null;
      status: 'success' | 'error';
      message: string;
    }> = [];
    let successCount = 0;
    let errorCount = 0;

    for (const id of assetIds) {
      try {
        // Check for asset deletion eligibility - same 3 criteria as single delete
        const assetWithChecks = await this.prisma.asset.findUnique({
          where: { id },
          include: {
            _count: {
              select: {
                assetIssues: true, // Any assignment history
                maintenanceSchedules: true, // Any maintenance history
              },
            },
          },
        });

        if (!assetWithChecks) {
          errorCount++;
          results.push({
            id,
            assetId: null,
            status: 'error',
            message: 'Asset not found',
          });
          continue;
        }

        // ✅ CRITERIA 1: Only AVAILABLE assets can be deleted
        if (assetWithChecks.status !== 'AVAILABLE') {
          errorCount++;
          results.push({
            id,
            assetId: assetWithChecks.assetId,
            status: 'error',
            message: `Cannot delete asset with status '${assetWithChecks.status}'. Only AVAILABLE assets can be deleted.`,
          });
          continue;
        }

        // ✅ CRITERIA 2: Never been assigned to anyone (no assignment history)
        if (assetWithChecks._count.assetIssues > 0) {
          errorCount++;
          results.push({
            id,
            assetId: assetWithChecks.assetId,
            status: 'error',
            message:
              'Cannot delete asset that has been assigned. Only assets that have never been assigned can be deleted.',
          });
          continue;
        }

        // ✅ CRITERIA 3: Never been in maintenance (no maintenance history)
        if (assetWithChecks._count.maintenanceSchedules > 0) {
          errorCount++;
          results.push({
            id,
            assetId: assetWithChecks.assetId,
            status: 'error',
            message:
              'Cannot delete asset that has been in maintenance. Only assets that have never been in maintenance can be deleted.',
          });
          continue;
        }

        // All 3 criteria passed - safe to delete
        await this.prisma.asset.delete({
          where: { id },
        });

        successCount++;
        results.push({
          id,
          assetId: assetWithChecks.assetId,
          status: 'success',
          message: 'Asset deleted successfully',
        });
      } catch (error) {
        errorCount++;
        results.push({
          id,
          assetId: null,
          status: 'error',
          message: error.message || 'Failed to delete asset',
        });
      }
    }

    return {
      message: `Bulk delete completed: ${successCount} succeeded, ${errorCount} failed`,
      data: {
        successCount,
        errorCount,
        totalProcessed: assetIds.length,
        results,
      },
    };
  }

  async getAssetStats() {
    const [totalAssets, available, assigned, inMaintenance, retired, lost] =
      await Promise.all([
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
    const {
      page = 1,
      limit = 10,
      search,
      assetTypeId,
      brandId,
      modelId,
      condition,
      location,
      sortBy = 'assetId',
      sortOrder = 'asc',
    } = queryDto;
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
    if (location)
      where.location = { contains: location, mode: 'insensitive' as const };

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
              category: { select: { id: true, name: true } },
            },
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

  async findDeletableAssets(queryDto: AssetQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      assetTypeId,
      brandId,
      modelId,
      vendorId,
      condition,
      location,
      fromDate,
      toDate,
      sortBy = 'assetId',
      sortOrder = 'asc',
    } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      // Only AVAILABLE assets
      status: 'AVAILABLE',
      // No assignment history
      assetIssues: {
        none: {},
      },
      // No maintenance history
      maintenanceSchedules: {
        none: {},
      },
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
    if (vendorId) where.vendorId = vendorId;
    if (condition) where.condition = condition;
    if (location)
      where.location = { contains: location, mode: 'insensitive' as const };

    // Date range filter (createdAt)
    if (fromDate || toDate) {
      where.createdAt = {} as any;
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

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
              category: { select: { id: true, name: true } },
            },
          },
          brand: { select: { id: true, name: true } },
          model: { select: { id: true, name: true, specifications: true } },
          vendor: { select: { id: true, name: true } },
          createdByUser: { select: { id: true, username: true } },
          _count: {
            select: {
              assetIssues: true,
              maintenanceSchedules: true,
              assetEvents: true,
            },
          },
        },
      }),
      this.prisma.asset.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      message: 'Deletable assets retrieved successfully',
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
    const {
      q,
      page = 1,
      limit = 10,
      assetTypeId,
      brandId,
      status,
      condition,
    } = queryDto;
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
    if (assetTypeId) where.assetTypeId = Number.parseInt(assetTypeId);
    if (brandId) where.brandId = Number.parseInt(brandId);
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
              category: { select: { id: true, name: true } },
            },
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
    if (assetTypeId) where.assetTypeId = Number.parseInt(assetTypeId);
    if (brandId) where.brandId = Number.parseInt(brandId);
    if (modelId) where.modelId = Number.parseInt(modelId);

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
                name: true,
              },
            },
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
        model: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        assetId: 'asc',
      },
    });

    return {
      message: 'Assets retrieved successfully',
      data: {
        assets,
      },
    };
  }

  /**
   * Validate uploaded file (CSV/Excel)
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const allowedMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only CSV and Excel files are allowed.',
      );
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException(
        'File size too large. Maximum size is 10MB.',
      );
    }
  }

  /**
   * Parse CSV or Excel file into rows
   */
  private parseFileToRows(file: Express.Multer.File): string[][] {
    let rows: string[][];

    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      // Handle CSV files
      const csvData = file.buffer.toString('utf-8');
      rows = csvData.split('\n').map((row) => row.split(','));
    } else {
      // Handle Excel files
      const XLSX = require('xlsx');
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const csvData = XLSX.utils.sheet_to_csv(worksheet);
      rows = csvData.split('\n').map((row) => row.split(','));
    }

    if (rows.length < 2) {
      throw new BadRequestException(
        'File must contain at least a header row and one data row',
      );
    }

    return rows;
  }

  /**
   * Validate and extract headers from parsed rows
   */
  private validateHeaders(rows: string[][]): string[] {
    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const requiredHeaders = [
      'assetid',
      'serialnumber',
      'assettypeid',
      'brandid',
      'modelid',
      'status',
      'condition',
    ];

    // Validate required headers
    const missingHeaders = requiredHeaders.filter(
      (header) => !headers.includes(header),
    );
    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `Missing required headers: ${missingHeaders.join(', ')}`,
      );
    }

    return headers;
  }

  /**
   * Load existing data from database for validation
   */
  private async loadValidationData(): Promise<{
    existingAssetIds: Set<string>;
    existingSerialNumbers: Set<string>;
    assetTypeMap: Map<number, any>;
    brandMap: Map<number, any>;
    modelMap: Map<number, any>;
    vendorMap: Map<number, any>;
  }> {
    const [existingAssets, assetTypes, brands, models, vendors] =
      await Promise.all([
        this.prisma.asset.findMany({
          select: { assetId: true, serialNumber: true },
        }),
        this.prisma.assetType.findMany({
          include: { models: { select: { id: true, name: true } } },
        }),
        this.prisma.brand.findMany({
          include: { models: { select: { id: true, name: true } } },
        }),
        this.prisma.model.findMany({
          select: { id: true, name: true, brandId: true, assetTypeId: true },
        }),
        this.prisma.vendor.findMany({
          select: { id: true, name: true },
        }),
      ]);

    // Create lookup maps
    const existingAssetIds = new Set(existingAssets.map((a) => a.assetId));
    const existingSerialNumbers = new Set(
      existingAssets
        .map((a) => a.serialNumber)
        .filter((s): s is string => s !== null),
    );
    const assetTypeMap = new Map(assetTypes.map((at) => [at.id, at]));
    const brandMap = new Map(brands.map((b) => [b.id, b]));
    const modelMap = new Map(models.map((m) => [m.id, m]));
    const vendorMap = new Map(vendors.map((v) => [v.id, v]));

    return {
      existingAssetIds,
      existingSerialNumbers,
      assetTypeMap,
      brandMap,
      modelMap,
      vendorMap,
    };
  }

  /**
   * Map CSV row data to asset object
   */
  private mapRowToAssetData(row: string[], headers: string[]): any {
    const assetData: any = {};

    // Map CSV columns to asset fields
    for (const [index, header] of headers.entries()) {
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
            assetData.assetTypeId = Number.parseInt(value);
            break;
          case 'brandid':
            assetData.brandId = Number.parseInt(value);
            break;
          case 'modelid':
            assetData.modelId = Number.parseInt(value);
            break;
          case 'vendorid':
            assetData.vendorId = Number.parseInt(value);
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
            assetData.purchaseCost = Number.parseFloat(value);
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
    }

    return assetData;
  }

  /**
   * Validate asset ID field
   */
  private validateAssetId(
    assetData: any,
    fileAssetIds: Set<string>,
    existingAssetIds: Set<string>,
    rowErrors: string[],
  ): void {
    if (assetData.assetId) {
      // Format validation
      const isValidAssetIdFormat = /^AST-\d{4}$/.test(assetData.assetId);
      if (!isValidAssetIdFormat) {
        rowErrors.push(
          `Asset ID format invalid. Expected: AST-XXXX (4 digits), got: ${assetData.assetId}`,
        );
      }
      // Check for duplicates within file
      if (fileAssetIds.has(assetData.assetId)) {
        rowErrors.push(
          `Asset ID '${assetData.assetId}' is duplicated within the file`,
        );
      } else {
        fileAssetIds.add(assetData.assetId);
      }
      // Uniqueness validation against database
      if (existingAssetIds.has(assetData.assetId)) {
        rowErrors.push(
          `Asset ID '${assetData.assetId}' already exists in database`,
        );
      }
    } else {
      rowErrors.push('Asset ID is required');
    }
  }

  /**
   * Validate serial number field
   */
  private validateSerialNumber(
    assetData: any,
    fileSerialNumbers: Set<string>,
    existingSerialNumbers: Set<string>,
    rowErrors: string[],
  ): void {
    if (assetData.serialNumber) {
      // Length validation
      if (
        assetData.serialNumber.length < 3 ||
        assetData.serialNumber.length > 50
      ) {
        rowErrors.push(
          `Serial number must be 3-50 characters, got: ${assetData.serialNumber.length} characters`,
        );
      }
      // Format validation
      const isValidSerialNumberFormat = /^[A-Za-z0-9\-_]{3,50}$/.test(assetData.serialNumber);
      if (!isValidSerialNumberFormat) {
        rowErrors.push(
          `Serial number must contain only letters, numbers, hyphens, and underscores, got: ${assetData.serialNumber}`,
        );
      }
      // Check for duplicates within file
      if (fileSerialNumbers.has(assetData.serialNumber)) {
        rowErrors.push(
          `Serial number '${assetData.serialNumber}' is duplicated within the file`,
        );
      } else {
        fileSerialNumbers.add(assetData.serialNumber);
      }
      // Uniqueness validation against database
      if (existingSerialNumbers.has(assetData.serialNumber)) {
        rowErrors.push(
          `Serial number '${assetData.serialNumber}' already exists in database`,
        );
      }
    } else {
      rowErrors.push('Serial number is required');
    }
  }

  /**
   * Validate a required foreign key field
   */
  private validateRequiredForeignKey(
    fieldName: string,
    fieldValue: any,
    fieldMap: Map<number, any>,
    rowErrors: string[],
  ): void {
    if (!fieldValue) {
      rowErrors.push(`${fieldName} is required`);
    } else if (Number.isNaN(fieldValue)) {
      rowErrors.push(`${fieldName} must be a valid number, got: ${fieldValue}`);
    } else if (!fieldMap.has(fieldValue)) {
      rowErrors.push(`${fieldName} ${fieldValue} does not exist in database`);
    }
  }

  /**
   * Validate model relationships with brand and asset type for bulk upload
   */
  private validateModelRelationshipsForBulk(
    assetData: any,
    modelMap: Map<number, any>,
    rowErrors: string[],
  ): void {
    const model = modelMap.get(assetData.modelId);
    if (model) {
      if (model.brandId !== assetData.brandId) {
        rowErrors.push(
          `Model ID ${assetData.modelId} does not belong to Brand ID ${assetData.brandId} (foreign key relationship error)`,
        );
      }
      if (model.assetTypeId !== assetData.assetTypeId) {
        rowErrors.push(
          `Model ID ${assetData.modelId} does not belong to Asset Type ID ${assetData.assetTypeId} (foreign key relationship error)`,
        );
      }
    }
  }

  /**
   * Validate optional vendor ID
   */
  private validateOptionalVendor(
    assetData: any,
    vendorMap: Map<number, any>,
    rowErrors: string[],
  ): void {
    if (assetData.vendorId && !Number.isNaN(assetData.vendorId)) {
      if (!vendorMap.has(assetData.vendorId)) {
        rowErrors.push(
          `Vendor ID ${assetData.vendorId} does not exist in database`,
        );
      }
    }
  }

  /**
   * Validate foreign key fields (asset type, brand, model, vendor)
   */
  private validateForeignKeyFields(
    assetData: any,
    assetTypeMap: Map<number, any>,
    brandMap: Map<number, any>,
    modelMap: Map<number, any>,
    vendorMap: Map<number, any>,
    rowErrors: string[],
  ): void {
    // Validate required foreign keys
    this.validateRequiredForeignKey(
      'Asset Type ID',
      assetData.assetTypeId,
      assetTypeMap,
      rowErrors,
    );
    this.validateRequiredForeignKey(
      'Brand ID',
      assetData.brandId,
      brandMap,
      rowErrors,
    );
    this.validateRequiredForeignKey(
      'Model ID',
      assetData.modelId,
      modelMap,
      rowErrors,
    );

    // Validate model relationships if model exists
    if (
      assetData.modelId &&
      !Number.isNaN(assetData.modelId) &&
      modelMap.has(assetData.modelId)
    ) {
      this.validateModelRelationshipsForBulk(assetData, modelMap, rowErrors);
    }

    // Validate optional vendor
    this.validateOptionalVendor(assetData, vendorMap, rowErrors);
  }

  /**
   * Validate status and condition fields
   */
  private validateStatusAndCondition(
    assetData: any,
    validStatuses: string[],
    validConditions: string[],
    rowErrors: string[],
  ): void {
    // Status validation
    if (!assetData.status) {
      rowErrors.push('Status is required');
    } else if (!validStatuses.includes(assetData.status)) {
      rowErrors.push(
        `Status value '${assetData.status}' is not valid. Must be one of: ${validStatuses.join(', ')}`,
      );
    }

    // Condition validation
    if (!assetData.condition) {
      rowErrors.push('Condition is required');
    } else if (!validConditions.includes(assetData.condition)) {
      rowErrors.push(
        `Condition value '${assetData.condition}' is not valid. Must be one of: ${validConditions.join(', ')}`,
      );
    }
  }

  /**
   * Validate location field
   */
  private validateLocation(assetData: any, rowErrors: string[]): void {
    if (
      assetData.location &&
      (assetData.location.length < 2 || assetData.location.length > 100)
    ) {
      rowErrors.push(
        `Location must be 2-100 characters, got: ${assetData.location.length} characters`,
      );
    }
  }

  /**
   * Validate date format and value
   */
  private validateDateFormat(
    dateString: string,
    fieldName: string,
    rowErrors: string[],
  ): Date | null {
    if (!/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
      rowErrors.push(
        `${fieldName} must be in DD-MM-YYYY format, got: ${dateString}`,
      );
      return null;
    }

    const [day, month, year] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    if (Number.isNaN(date.getTime())) {
      rowErrors.push(`Invalid ${fieldName.toLowerCase()}: ${dateString}`);
      return null;
    }

    return date;
  }

  /**
   * Validate purchase date
   */
  private validatePurchaseDate(assetData: any, rowErrors: string[]): void {
    if (assetData.purchaseDate) {
      const date = this.validateDateFormat(
        assetData.purchaseDate,
        'Purchase date',
        rowErrors,
      );
      if (date && date > new Date()) {
        rowErrors.push(
          `Purchase date cannot be in the future: ${assetData.purchaseDate}`,
        );
      }
    }
  }

  /**
   * Validate purchase cost
   */
  private validatePurchaseCost(assetData: any, rowErrors: string[]): void {
    if (
      assetData.purchaseCost !== undefined &&
      assetData.purchaseCost !== null
    ) {
      if (Number.isNaN(assetData.purchaseCost)) {
        rowErrors.push(
          `Purchase cost must be a valid number, got: ${assetData.purchaseCost}`,
        );
      } else if (assetData.purchaseCost < 0) {
        rowErrors.push(
          `Purchase cost cannot be negative, got: ${assetData.purchaseCost}`,
        );
      } else if (assetData.purchaseCost > 1000000) {
        rowErrors.push(
          `Purchase cost cannot exceed ₹10,00,000, got: ${assetData.purchaseCost}`,
        );
      }
    }
  }

  /**
   * Validate warranty start date
   */
  private validateWarrantyStartDate(assetData: any, rowErrors: string[]): void {
    if (assetData.warrantyStartDate) {
      this.validateDateFormat(
        assetData.warrantyStartDate,
        'Warranty start date',
        rowErrors,
      );
    }
  }

  /**
   * Validate warranty end date
   */
  private validateWarrantyEndDate(assetData: any, rowErrors: string[]): void {
    if (assetData.warrantyEndDate) {
      const endDate = this.validateDateFormat(
        assetData.warrantyEndDate,
        'Warranty end date',
        rowErrors,
      );

      if (endDate && assetData.warrantyStartDate) {
        const startDate = this.validateDateFormat(
          assetData.warrantyStartDate,
          'Warranty start date',
          rowErrors,
        );
        if (startDate && endDate <= startDate) {
          rowErrors.push(`Warranty end date must be after warranty start date`);
        }
      }
    }
  }

  /**
   * Validate notes field
   */
  private validateNotes(assetData: any, rowErrors: string[]): void {
    if (assetData.notes && assetData.notes.length > 1000) {
      rowErrors.push(
        `Notes cannot exceed 1000 characters, got: ${assetData.notes.length} characters`,
      );
    }
  }

  /**
   * Validate optional fields (location, dates, cost, notes)
   */
  private validateOptionalFields(assetData: any, rowErrors: string[]): void {
    this.validateLocation(assetData, rowErrors);
    this.validatePurchaseDate(assetData, rowErrors);
    this.validatePurchaseCost(assetData, rowErrors);
    this.validateWarrantyStartDate(assetData, rowErrors);
    this.validateWarrantyEndDate(assetData, rowErrors);
    this.validateNotes(assetData, rowErrors);
  }

  /**
   * Process and validate a single row
   */
  private processRow(
    row: string[],
    rowNumber: number,
    headers: string[],
    validationContext: ValidationContext,
  ): { errors: any[]; validData?: any } {
    const rowErrors: string[] = [];

    try {
      // Map CSV columns to asset fields
      const assetData = this.mapRowToAssetData(row, headers);

      // Validate all fields using validation context
      this.validateAssetId(
        assetData,
        validationContext.fileAssetIds,
        validationContext.existingAssetIds,
        rowErrors,
      );
      this.validateSerialNumber(
        assetData,
        validationContext.fileSerialNumbers,
        validationContext.existingSerialNumbers,
        rowErrors,
      );
      this.validateForeignKeyFields(
        assetData,
        validationContext.assetTypeMap,
        validationContext.brandMap,
        validationContext.modelMap,
        validationContext.vendorMap,
        rowErrors,
      );
      this.validateStatusAndCondition(
        assetData,
        validationContext.validStatuses,
        validationContext.validConditions,
        rowErrors,
      );
      this.validateOptionalFields(assetData, rowErrors);

      if (rowErrors.length > 0) {
        // Add individual error messages for better readability
        const errors = rowErrors.map((errorMsg) => ({
          row: rowNumber,
          field: 'validation',
          message: errorMsg,
          value: JSON.stringify(assetData),
        }));
        return { errors };
      } else {
        return { errors: [], validData: { rowNumber, assetData } };
      }
    } catch (error) {
      return {
        errors: [
          {
            row: rowNumber,
            field: 'parsing_error',
            message: `Error parsing row: ${error.message}`,
            value: row.join(', '),
          },
        ],
      };
    }
  }

  async validateBulkUpload(file: Express.Multer.File, userId: number) {
    this.validateFile(file);

    try {
      // Parse CSV/Excel file
      const rows = this.parseFileToRows(file);

      // Validate headers
      const headers = this.validateHeaders(rows);

      const dataRows = rows
        .slice(1)
        .filter((row) => row.some((cell) => cell.trim()));
      const errors: any[] = [];
      const validRows: any[] = [];

      // Load existing data for validation
      const {
        existingAssetIds,
        existingSerialNumbers,
        assetTypeMap,
        brandMap,
        modelMap,
        vendorMap,
      } = await this.loadValidationData();

      // Valid enum values - Only AVAILABLE status allowed for bulk uploads
      const validStatuses = ['AVAILABLE'];
      const validConditions = [
        'NEW',
        'GOOD',
        'FAIR',
        'POOR',
        'DAMAGED',
        'REFURBISHED',
      ];

      // Track duplicates within the file
      const fileAssetIds = new Set<string>();
      const fileSerialNumbers = new Set<string>();

      // Process each row
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNumber = i + 2; // +2 because we start from row 2 (after header)

        const validationContext: ValidationContext = {
          fileAssetIds,
          fileSerialNumbers,
          existingAssetIds,
          existingSerialNumbers,
          assetTypeMap,
          brandMap,
          modelMap,
          vendorMap,
          validStatuses,
          validConditions,
        };

        const result = this.processRow(
          row,
          rowNumber,
          headers,
          validationContext,
        );

        errors.push(...result.errors);
        if (result.validData) {
          validRows.push(result.validData);
        }
      }

      return {
        message: 'File validation completed',
        data: {
          totalRows: dataRows.length,
          validRows: validRows.length,
          invalidRows: errors.length,
          errors,
          validationOnly: true,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Validation failed: ${error.message}`);
    }
  }

  /**
   * Validate headers for bulk upload
   */
  private validateBulkUploadHeaders(headers: string[]): void {
    const requiredHeaders = ['assetid', 'assettypeid', 'brandid', 'modelid'];
    const missingHeaders = requiredHeaders.filter(
      (header) => !headers.includes(header),
    );

    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `Missing required headers: ${missingHeaders.join(', ')}`,
      );
    }
  }

  /**
   * Map row data to asset data
   */
  private mapBulkUploadRowData(row: string[], headers: string[]): any {
    const assetData: any = {};

    for (const [index, header] of headers.entries()) {
      const value = row[index]?.trim();
      if (value) {
        switch (header) {
          case 'assetid':
            assetData.assetId = value;
            break;
          case 'assettypeid':
            assetData.assetTypeId = Number.parseInt(value);
            break;
          case 'brandid':
            assetData.brandId = Number.parseInt(value);
            break;
          case 'modelid':
            assetData.modelId = Number.parseInt(value);
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
            assetData.purchaseCost = Number.parseFloat(value);
            break;
          case 'vendorid':
            assetData.vendorId = Number.parseInt(value);
            break;
        }
      }
    }

    return assetData;
  }

  /**
   * Validate asset data for bulk upload
   */
  private validateBulkUploadAssetData(
    assetData: any,
    rowNumber: number,
  ): any[] {
    const errors: any[] = [];

    if (
      !assetData.assetId ||
      !assetData.assetTypeId ||
      !assetData.brandId ||
      !assetData.modelId
    ) {
      errors.push({
        row: rowNumber,
        field: 'required_fields',
        message:
          'Missing required fields: assetId, assetTypeId, brandId, or modelId',
      });
    }

    if (
      Number.isNaN(assetData.assetTypeId) ||
      Number.isNaN(assetData.brandId) ||
      Number.isNaN(assetData.modelId)
    ) {
      errors.push({
        row: rowNumber,
        field: 'invalid_ids',
        message: 'AssetTypeId, BrandId, and ModelId must be valid numbers',
      });
    }

    if (assetData.status && assetData.status !== 'AVAILABLE') {
      errors.push({
        row: rowNumber,
        field: 'status',
        message: `Status value '${assetData.status}' is not valid. Only 'AVAILABLE' status is allowed for bulk uploads`,
      });
    }

    return errors;
  }

  /**
   * Import a single asset
   */
  private async importBulkUploadAsset(
    assetData: any,
    userId: number,
  ): Promise<{ success: boolean; error?: any }> {
    try {
      const { rowNumber, ...createData } = assetData;

      const [assetType, brand, model, vendor] = await Promise.all([
        this.prisma.assetType.findUnique({
          where: { id: createData.assetTypeId },
        }),
        this.prisma.brand.findUnique({ where: { id: createData.brandId } }),
        this.prisma.model.findUnique({ where: { id: createData.modelId } }),
        createData.vendorId
          ? this.prisma.vendor.findUnique({
              where: { id: createData.vendorId },
            })
          : Promise.resolve(null),
      ]);

      if (!assetType || !brand || !model || (createData.vendorId && !vendor)) {
        return {
          success: false,
          error: {
            row: rowNumber,
            field: 'foreign_key',
            message: 'Foreign key reference not found',
          },
        };
      }

      const asset = await this.prisma.asset.create({
        data: {
          ...createData,
          purchaseDate: createData.purchaseDate
            ? new Date(createData.purchaseDate)
            : null,
        },
      });

      await this.prisma.assetEvent.create({
        data: {
          assetId: asset.id,
          eventType: AssetEventType.ASSET_CREATED,
          eventDate: new Date(),
          performedBy: userId,
          metadata: {
            assetId: asset.assetId,
            assetType: assetType.name,
            brand: brand.name,
            model: model.name,
            serialNumber: asset.serialNumber,
            condition: asset.condition,
            status: asset.status,
            location: asset.location,
            purchaseCost: asset.purchaseCost,
            vendor: vendor?.name || null,
            bulkUpload: true,
            rowNumber: rowNumber,
          },
        },
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          row: assetData.rowNumber,
          field: 'database_error',
          message: error.message,
        },
      };
    }
  }

  async bulkUpload(
    file: Express.Multer.File,
    userId: number,
    isValidateOnly: boolean = false,
  ) {
    this.validateFile(file);

    try {
      const rows = this.parseFileToRows(file);
      const headers = rows[0].map((h) => h.trim().toLowerCase());
      this.validateBulkUploadHeaders(headers);

      const dataRows = rows
        .slice(1)
        .filter((row) => row.some((cell) => cell.trim()));
      const errors: any[] = [];
      const validAssets: any[] = [];

      // Process each row
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNumber = i + 2;

        try {
          const assetData = this.mapBulkUploadRowData(row, headers);
          const validationErrors = this.validateBulkUploadAssetData(
            assetData,
            rowNumber,
          );

          if (validationErrors.length > 0) {
            errors.push(...validationErrors);
            continue;
          }

          if (!assetData.status) {
            assetData.status = 'AVAILABLE';
          }

          validAssets.push({
            ...assetData,
            createdBy: userId,
            updatedBy: userId,
            rowNumber,
          });
        } catch (error) {
          errors.push({
            row: rowNumber,
            field: 'parsing_error',
            message: `Error parsing row: ${error.message}`,
          });
        }
      }

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
              validationOnly: true,
            },
          },
        };
      }

      // Import valid assets
      let imported = 0;
      for (const assetData of validAssets) {
        const result = await this.importBulkUploadAsset(assetData, userId);
        if (result.success) {
          imported++;
        } else {
          errors.push(result.error);
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
            validationErrors: errors.length,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(`Error processing file: ${error.message}`);
    }
  }

  /**
   * Retire an asset with proper audit logging
   */
  async retireAsset(
    assetId: number,
    retireAssetDto: RetireAssetDto,
    userId: number,
  ) {
    try {
      // Find the asset first
      const asset = await this.prisma.asset.findUnique({
        where: { id: assetId },
        include: {
          assetType: { select: { name: true } },
          brand: { select: { name: true } },
          model: { select: { name: true } },
        },
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
        throw new BadRequestException(
          'Cannot retire an asset that is currently assigned to an employee',
        );
      }

      // Check if asset is in maintenance
      if (asset.status === 'IN_MAINTENANCE') {
        throw new BadRequestException(
          'Cannot retire an asset that is currently in maintenance',
        );
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
          updatedAt: new Date(),
        },
        include: {
          assetType: { select: { name: true } },
          brand: { select: { name: true } },
          model: { select: { name: true } },
        },
      });

      // Log asset retirement event
      await this.prisma.assetEvent.create({
        data: {
          assetId: assetId,
          eventType: AssetEventType.ASSET_RETIRED,
          eventDate: new Date(),
          performedBy: userId,
          metadata: {
            assetId: asset.assetId,
            assetType: asset.assetType.name,
            brand: asset.brand.name,
            model: asset.model.name,
            retirementDate: retireAssetDto.retirementDate,
            retirementReason: retireAssetDto.retirementReason,
            retirementNotes: retireAssetDto.retirementNotes || null,
            previousStatus: asset.status,
            newStatus: 'RETIRED',
            retiredVia: 'AssetsView',
          },
        },
      });

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
            model: updatedAsset.model.name,
          },
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(`Error retiring asset: ${error.message}`);
    }
  }

  async reactivateAsset(
    assetId: number,
    reactivateAssetDto: ReactivateAssetDto,
    userId: number,
  ) {
    try {
      // Find the asset first
      const asset = await this.prisma.asset.findUnique({
        where: { id: assetId },
        include: {
          assetType: { select: { name: true } },
          brand: { select: { name: true } },
          model: { select: { name: true } },
        },
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
          updatedAt: new Date(),
        },
        include: {
          assetType: { select: { name: true } },
          brand: { select: { name: true } },
          model: { select: { name: true } },
        },
      });

      // Log asset reactivation event
      await this.prisma.assetEvent.create({
        data: {
          assetId: assetId,
          eventType: AssetEventType.ASSET_REACTIVATED,
          eventDate: new Date(),
          performedBy: userId,
          metadata: {
            assetId: asset.assetId,
            assetType: asset.assetType.name,
            brand: asset.brand.name,
            model: asset.model.name,
            reactivationDate: reactivateAssetDto.reactivationDate,
            reactivationReason: reactivateAssetDto.reactivationReason,
            previousStatus: asset.status,
            newStatus: reactivateAssetDto.status,
            previousCondition: asset.condition,
            newCondition: reactivateAssetDto.condition,
            previousLocation: asset.location,
            newLocation: reactivateAssetDto.location,
            reactivatedVia: 'AssetsView',
          },
        },
      });

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
            model: updatedAsset.model.name,
          },
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Error reactivating asset: ${error.message}`,
      );
    }
  }

  async exportAssets(queryDto: AssetQueryDto) {
    try {
      const XLSX = require('xlsx');

      // Get all assets with the same filtering logic as findAll
      const {
        status,
        assetTypeId,
        brandId,
        modelId,
        search,
        condition,
        location,
        sortBy = 'assetId',
        sortOrder = 'asc',
      } = queryDto;

      console.log('Export query params:', {
        status,
        assetTypeId,
        brandId,
        modelId,
        search,
        condition,
        location,
        sortBy,
        sortOrder,
      });

      // Build where clause
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (assetTypeId) {
        where.assetTypeId =
          typeof assetTypeId === 'string'
            ? Number.parseInt(assetTypeId)
            : assetTypeId;
      }

      if (brandId) {
        where.brandId =
          typeof brandId === 'string' ? Number.parseInt(brandId) : brandId;
      }

      if (modelId) {
        where.modelId =
          typeof modelId === 'string' ? Number.parseInt(modelId) : modelId;
      }

      if (condition) {
        where.condition = condition;
      }

      if (location) {
        where.location = {
          contains: location,
          mode: 'insensitive',
        };
      }

      if (search) {
        where.OR = [
          { assetId: { contains: search, mode: 'insensitive' } },
          { serialNumber: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
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
              category: { select: { id: true, name: true } },
            },
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
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy,
      });

      // Prepare data for Excel export
      const exportData = assets.map((asset) => ({
        'Asset ID': asset.assetId,
        'Serial Number': asset.serialNumber || '',
        Category: asset.assetType?.category?.name || '',
        'Asset Type': asset.assetType?.name || '',
        Brand: asset.brand?.name || '',
        Model: asset.model?.name || '',
        Vendor: asset.vendor?.name || '',
        Status: asset.status,
        Condition: asset.condition,
        Location: asset.location || '',
        'Assigned To':
          asset.assetIssues && asset.assetIssues.length > 0
            ? `${asset.assetIssues[0].employee.firstName} ${asset.assetIssues[0].employee.lastName} (${asset.assetIssues[0].employee.employeeId})`
            : 'Unassigned',
        'Purchase Date': asset.purchaseDate
          ? new Date(asset.purchaseDate).toLocaleDateString('en-GB')
          : '',
        'Purchase Cost': asset.purchaseCost
          ? `₹${asset.purchaseCost.toLocaleString()}`
          : '',
        'Warranty Start': asset.warrantyStartDate
          ? new Date(asset.warrantyStartDate).toLocaleDateString('en-GB')
          : '',
        'Warranty End': asset.warrantyEndDate
          ? new Date(asset.warrantyEndDate).toLocaleDateString('en-GB')
          : '',
        Notes: asset.notes || '',
        'Retirement Date': asset.retirementDate
          ? new Date(asset.retirementDate).toLocaleDateString('en-GB')
          : '',
        'Retirement Reason': asset.retirementReason || '',
        'Reactivation Date': asset.reactivationDate
          ? new Date(asset.reactivationDate).toLocaleDateString('en-GB')
          : '',
        'Reactivation Reason': asset.reactivationReason || '',
        'Created By': asset.createdByUser?.username || '',
        'Created At': asset.createdAt
          ? new Date(asset.createdAt).toLocaleString('en-GB')
          : '',
        'Updated By': asset.updatedByUser?.username || '',
        'Updated At': asset.updatedAt
          ? new Date(asset.updatedAt).toLocaleString('en-GB')
          : '',
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
        { wch: 20 }, // Updated At
      ];
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');

      // Generate Excel file buffer
      const excelBuffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
      });

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `assets_export_${timestamp}.xlsx`;

      return {
        message: 'Assets exported successfully',
        data: {
          filename,
          buffer: excelBuffer,
          count: assets.length,
        },
      };
    } catch (error) {
      throw new BadRequestException(`Export failed: ${error.message}`);
    }
  }

  /**
   * Format value for display in changes array
   */
  private formatValueForDisplay(value: any): string | null {
    if (value === null || value === undefined) return null;

    // Handle Date objects only (not strings that look like dates)
    if (value instanceof Date) {
      return value.toISOString().split('T')[0]; // yyyy-mm-dd format
    }

    // Return as-is for all other values (strings, numbers, etc.)
    return value.toString();
  }
}

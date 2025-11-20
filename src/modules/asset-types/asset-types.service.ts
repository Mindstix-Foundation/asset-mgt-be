import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import {
  CreateAssetTypeDto,
  AssetTypeQueryDto,
  SpecificationTemplateInputDto,
  UpdateAssetTypeDto,
} from './dto';
type StoredSpecificationOption = {
  value: string;
  deprecated?: boolean;
};

type StoredSpecificationField = {
  key: string;
  label: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  options?: StoredSpecificationOption[];
  [key: string]: any;
};

type StoredSpecificationTemplate = {
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  fields: StoredSpecificationField[];
};

@Injectable()
export class AssetTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAssetTypeDto: CreateAssetTypeDto, userId: number) {
    try {
      // Verify category exists
      const category = await this.prisma.assetCategory.findUnique({
        where: { id: createAssetTypeDto.categoryId },
      });

      if (!category) {
        throw new BadRequestException('Asset category not found');
      }

      const { specificationTemplate, ...restDto } = createAssetTypeDto;
      const processedTemplate = specificationTemplate
        ? this.buildSpecificationTemplateWithKeys(specificationTemplate)
        : undefined;

      const assetType = await this.prisma.assetType.create({
        data: {
          ...restDto,
          specificationTemplate: processedTemplate,
          createdBy: userId,
          updatedBy: userId,
        },
        include: {
          category: {
            select: { id: true, name: true },
          },
          createdByUser: {
            select: { id: true, username: true },
          },
          _count: {
            select: { assets: true, models: true },
          },
        },
      });

      return {
        message: 'Asset type created successfully',
        data: { assetType },
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Asset type name already exists in this category',
        );
      }
      throw error;
    }
  }

  async update(
    id: number,
    updateAssetTypeDto: UpdateAssetTypeDto,
    userId: number,
  ) {
    const existingAssetType = await this.prisma.assetType.findUnique({
      where: { id },
    });

    if (!existingAssetType) {
      throw new NotFoundException('Asset type not found');
    }

    if (updateAssetTypeDto.name !== undefined) {
      throw new BadRequestException('Asset type name cannot be edited');
    }

    if (updateAssetTypeDto.categoryId !== undefined) {
      throw new BadRequestException('Asset type category cannot be edited');
    }

    const { specificationTemplate, ...restDto } = updateAssetTypeDto;
    const sanitizedDto: Record<string, any> = { ...restDto };
    delete sanitizedDto.name;
    delete sanitizedDto.categoryId;

    let processedTemplate: Record<string, any> | undefined;
    if (specificationTemplate) {
      processedTemplate = this.buildSpecificationTemplateWithKeys(
        specificationTemplate,
        existingAssetType.specificationTemplate as StoredSpecificationTemplate,
      );
    }

    if (!processedTemplate && Object.keys(sanitizedDto).length === 0) {
      throw new BadRequestException(
        'No updates provided. Specify at least one field to update.',
      );
    }

    const assetType = await this.prisma.assetType.update({
      where: { id },
      data: {
        ...sanitizedDto,
        ...(processedTemplate
          ? { specificationTemplate: processedTemplate }
          : {}),
        updatedBy: userId,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        createdByUser: {
          select: { id: true, username: true },
        },
        _count: {
          select: { assets: true, models: true },
        },
      },
    });

    return {
      message: 'Asset type updated successfully',
      data: { assetType },
    };
  }

  async findAll(queryDto: AssetTypeQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      isActive,
      sortBy = 'name',
      sortOrder = 'asc',
    } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const orderBy = { [sortBy]: sortOrder } as any;

    const [assetTypes, totalCount] = await Promise.all([
      this.prisma.assetType.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: {
            select: { id: true, name: true },
          },
          createdByUser: {
            select: { id: true, username: true },
          },
          _count: {
            select: { assets: true, models: true },
          },
        },
      }),
      this.prisma.assetType.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      message: 'Asset types retrieved successfully',
      data: {
        assetTypes,
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

  async findByCategory(categoryId: number) {
    // First verify the category exists
    const category = await this.prisma.assetCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Asset category not found');
    }

    const assetTypes = await this.prisma.assetType.findMany({
      where: {
        categoryId: categoryId,
        isActive: true,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        createdByUser: {
          select: { id: true, username: true },
        },
        _count: {
          select: { assets: true, models: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      message: 'Asset types retrieved successfully',
      data: { assetTypes },
    };
  }

  async findOne(id: number) {
    const assetType = await this.prisma.assetType.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, description: true },
        },
        createdByUser: {
          select: { id: true, username: true },
        },
        updatedByUser: {
          select: { id: true, username: true },
        },
        models: {
          select: {
            id: true,
            name: true,
            brand: {
              select: { id: true, name: true },
            },
            _count: {
              select: { assets: true },
            },
          },
        },
        assets: {
          select: {
            id: true,
            assetId: true,
            status: true,
            condition: true,
            brand: {
              select: { id: true, name: true },
            },
          },
          take: 10, // Limit to first 10 assets
        },
        _count: {
          select: { assets: true, models: true },
        },
      },
    });

    if (!assetType) {
      throw new NotFoundException('Asset type not found');
    }

    return {
      message: 'Asset type retrieved successfully',
      data: { assetType },
    };
  }

  async remove(id: number) {
    try {
      // Check if asset type has associated models or assets
      const assetTypeWithRelations = await this.prisma.assetType.findUnique({
        where: { id },
        include: {
          _count: {
            select: { models: true, assets: true },
          },
        },
      });

      if (!assetTypeWithRelations) {
        throw new NotFoundException('Asset type not found');
      }

      if (
        assetTypeWithRelations._count.models > 0 ||
        assetTypeWithRelations._count.assets > 0
      ) {
        throw new BadRequestException(
          'Cannot delete asset type with associated models or assets',
        );
      }

      await this.prisma.assetType.delete({
        where: { id },
      });

      return {
        message: 'Asset type deleted successfully',
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Asset type not found');
      }
      throw error;
    }
  }

  private buildSpecificationTemplateWithKeys(
    template: SpecificationTemplateInputDto,
    existingTemplate?: StoredSpecificationTemplate | null,
  ) {
    const normalizedExisting =
      this.normalizeSpecificationTemplate(existingTemplate);
    const usedKeys = new Set<string>(
      normalizedExisting?.fields.map((field) => field.key) ?? [],
    );

    const fields = template.fields.map((field, index) => {
      const trimmedLabel = field.label?.trim();
      if (!trimmedLabel) {
        throw new BadRequestException(
          `Specification field #${index + 1} must include a label.`,
        );
      }

      const incomingKey = field.key?.trim();
      const existingField =
        incomingKey && normalizedExisting
          ? normalizedExisting.fields.find(
              (existing) => existing.key === incomingKey,
            )
          : undefined;

      if (incomingKey && normalizedExisting && !existingField) {
        throw new BadRequestException(
          `Specification field with key "${incomingKey}" does not exist.`,
        );
      }

      const key = incomingKey
        ? incomingKey
        : this.generateUniqueFieldKey(trimmedLabel, usedKeys);
      usedKeys.add(key);

      const fieldType = field.type ?? existingField?.type ?? 'dropdown';

      const options = this.buildSpecificationFieldOptions(
        field,
        existingField,
        trimmedLabel,
        fieldType,
      );

      return {
        key,
        label: trimmedLabel,
        type: fieldType,
        required: field.required ?? existingField?.required ?? false,
        options,
      };
    });

    if (normalizedExisting) {
      const incomingKeys = new Set(fields.map((field) => field.key));
      for (const existingField of normalizedExisting.fields) {
        if (!incomingKeys.has(existingField.key)) {
          const normalizedField = this.normalizeLegacyField(existingField);
          if (normalizedField.type !== 'dropdown') {
            fields.push(normalizedField);
            continue;
          }

          throw new BadRequestException(
            `Existing specification field "${existingField.label}" cannot be removed.`,
          );
        }
      }
    }

    const now = new Date().toISOString();

    return {
      version: normalizedExisting
        ? (normalizedExisting.version ?? 1) + 1
        : (template.version ?? 1),
      createdAt: normalizedExisting?.createdAt ?? now,
      updatedAt: now,
      fields,
    };
  }

  private buildSpecificationFieldOptions(
    field: SpecificationTemplateInputDto['fields'][number],
    existingField: StoredSpecificationField | undefined,
    fieldLabel: string,
    fieldType: string,
  ) {
    if (fieldType !== 'dropdown') {
      return existingField?.options ?? [];
    }

    if (!field.options || field.options.length === 0) {
      throw new BadRequestException(
        `Specification field "${fieldLabel}" must include at least one option.`,
      );
    }

    const existingOptionsMap =
      existingField && Array.isArray(existingField.options)
        ? new Map(existingField.options.map((option) => [option.value, option]))
        : undefined;

    const normalizedOptions: StoredSpecificationOption[] = [];
    const seenValues = new Set<string>();

    field.options.forEach((option, index) => {
      const trimmedValue = option.value?.trim();
      if (!trimmedValue) {
        throw new BadRequestException(
          `Option #${index + 1} in field "${fieldLabel}" must include a value.`,
        );
      }

      const dedupeKey = trimmedValue.toLowerCase();
      if (seenValues.has(dedupeKey)) {
        throw new BadRequestException(
          `Duplicate option "${trimmedValue}" in field "${fieldLabel}".`,
        );
      }
      seenValues.add(dedupeKey);

      const existingOption = existingOptionsMap?.get(trimmedValue);

      normalizedOptions.push({
        value: trimmedValue,
        deprecated: option.deprecated ?? existingOption?.deprecated ?? false,
      });
    });

    if (existingOptionsMap) {
      for (const value of existingOptionsMap.keys()) {
        if (!normalizedOptions.some((option) => option.value === value)) {
          throw new BadRequestException(
            `Existing option "${value}" in field "${fieldLabel}" cannot be removed.`,
          );
        }
      }
    }

    return normalizedOptions;
  }

  private normalizeSpecificationTemplate(
    template?: StoredSpecificationTemplate | null,
  ): StoredSpecificationTemplate | null {
    if (!template || typeof template !== 'object') {
      return null;
    }

    const rawFields = (template as any).fields;
    if (!Array.isArray(rawFields) || rawFields.length === 0) {
      return null;
    }

    const fields = rawFields
      .map((field: any) => {
        const key = field.key ?? field.name;
        const label = field.label ?? field.name ?? field.key;
        if (!key || !label) {
          return null;
        }

        const resolvedType =
          field.type ||
          field.fieldType ||
          (Array.isArray(field.options) ? 'dropdown' : 'text');

        const rawOptions = field.options;
        const options: StoredSpecificationOption[] = [];

        if (Array.isArray(rawOptions)) {
          for (const option of rawOptions) {
            if (typeof option === 'string') {
              options.push({ value: option, deprecated: false });
              continue;
            }

            if (option?.value) {
              options.push({
                value: option.value,
                deprecated:
                  typeof option.deprecated === 'boolean'
                    ? option.deprecated
                    : false,
              });
            }
          }
        }

        return {
          key: key.toString(),
          label: label.toString(),
          required: field.required ?? false,
          type: resolvedType,
          options,
          placeholder: field.placeholder,
        };
      })
      .filter(Boolean) as StoredSpecificationField[];

    if (!fields.length) {
      return null;
    }

    return {
      version: (template as any).version ?? 1,
      createdAt: (template as any).createdAt,
      updatedAt: (template as any).updatedAt,
      fields,
    };
  }

  private generateUniqueFieldKey(label: string, usedKeys: Set<string>) {
    let baseKey = label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');

    if (!baseKey) {
      baseKey = 'field';
    }

    if (!/^[a-z]/.test(baseKey)) {
      baseKey = `field_${baseKey}`;
    }

    baseKey = baseKey.substring(0, 50) || 'field';

    let candidateKey = baseKey;
    let suffixCounter = 1;

    while (usedKeys.has(candidateKey)) {
      const suffix = `_${suffixCounter++}`;
      const maxBaseLength = Math.max(1, 50 - suffix.length);
      candidateKey = `${baseKey.substring(0, maxBaseLength)}${suffix}`;
    }

    usedKeys.add(candidateKey);
    return candidateKey;
  }

  private normalizeLegacyField(field: StoredSpecificationField) {
    const resolvedType =
      field.type ||
      (Array.isArray(field.options) ? 'dropdown' : 'text') ||
      'dropdown';

    return {
      key: field.key,
      label: field.label,
      type: resolvedType,
      required: field.required ?? false,
      options: resolvedType === 'dropdown' ? (field.options ?? []) : [],
      placeholder: field.placeholder,
    };
  }
}

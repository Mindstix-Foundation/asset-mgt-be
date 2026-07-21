import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class AssetIdService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate the next sequential asset ID in format AST-XXXX scoped to tenant
   * @returns Promise<string> - Next asset ID (e.g., AST-0001)
   */
  async generateNextAssetId(tenantId: number): Promise<string> {
    try {
      // Get the highest existing asset ID within the tenant
      const lastAsset = await this.prisma.asset.findFirst({
        where: {
          tenantId,
          assetId: {
            startsWith: 'AST-',
          },
        },
        orderBy: {
          assetId: 'desc',
        },
        select: {
          assetId: true,
        },
      });

      let nextNumber = 1;

      if (lastAsset) {
        // Extract the number from the last asset ID
        const lastNumber = Number.parseInt(
          lastAsset.assetId.replace('AST-', ''),
        );
        if (!Number.isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }

      // Format with leading zeros (4 digits)
      const formattedNumber = nextNumber.toString().padStart(4, '0');
      return `AST-${formattedNumber}`;
    } catch (error) {
      console.error('Error generating asset ID:', error);
      // Fallback to timestamp-based ID if database query fails
      const timestamp = Date.now().toString().slice(-6);
      return `AST-${timestamp}`;
    }
  }

  /**
   * Validate if an asset ID is in the correct format
   * @param assetId - Asset ID to validate
   * @returns boolean - True if format is correct
   */
  validateAssetIdFormat(assetId: string): boolean {
    const regex = /^AST-\d{4}$/;
    return regex.test(assetId);
  }

  /**
   * Check if an asset ID already exists within the tenant
   * @param tenantId - Tenant ID
   * @param assetId - Asset ID to check
   * @returns Promise<boolean> - True if exists
   */
  async assetIdExists(tenantId: number, assetId: string): Promise<boolean> {
    const existingAsset = await this.prisma.asset.findFirst({
      where: { tenantId, assetId },
      select: { id: true },
    });
    return !!existingAsset;
  }
}

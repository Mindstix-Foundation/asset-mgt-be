import { IsEnum } from 'class-validator';
import { VendorStatus } from '@prisma/client';

export class VendorStatusDto {
  @IsEnum(VendorStatus)
  status: VendorStatus;
}

/*
  Warnings:

  - The values [PENDING,SUSPENDED] on the enum `VendorStatus` will be removed. If these variants are still used in the database, this will fail.
  - The `vendor_type` column on the `vendors` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."VendorType" AS ENUM ('SUPPLIER', 'SERVICE', 'MANUFACTURER', 'DISTRIBUTOR', 'CONTRACTOR', 'BOTH');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."VendorStatus_new" AS ENUM ('ACTIVE', 'INACTIVE');
ALTER TABLE "public"."vendors" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."vendors" ALTER COLUMN "status" TYPE "public"."VendorStatus_new" USING ("status"::text::"public"."VendorStatus_new");
ALTER TYPE "public"."VendorStatus" RENAME TO "VendorStatus_old";
ALTER TYPE "public"."VendorStatus_new" RENAME TO "VendorStatus";
DROP TYPE "public"."VendorStatus_old";
ALTER TABLE "public"."vendors" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterTable
ALTER TABLE "public"."vendors" DROP COLUMN "vendor_type",
ADD COLUMN     "vendor_type" "public"."VendorType" NOT NULL DEFAULT 'SUPPLIER';

-- CreateIndex
CREATE INDEX "vendors_vendor_type_idx" ON "public"."vendors"("vendor_type");

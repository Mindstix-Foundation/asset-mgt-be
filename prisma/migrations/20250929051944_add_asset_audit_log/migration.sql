-- CreateEnum
CREATE TYPE "public"."AuditChangeType" AS ENUM ('STATUS_CHANGE', 'CONDITION_CHANGE', 'LOCATION_CHANGE', 'FIELD_UPDATE', 'RETIREMENT', 'REACTIVATION');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."VendorStatus" ADD VALUE 'PENDING';
ALTER TYPE "public"."VendorStatus" ADD VALUE 'SUSPENDED';

-- CreateTable
CREATE TABLE "public"."asset_audit_logs" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "field_name" VARCHAR(50) NOT NULL,
    "old_value" VARCHAR(255),
    "new_value" VARCHAR(255),
    "change_type" "public"."AuditChangeType" NOT NULL,
    "change_reason" VARCHAR(255),
    "changed_by" INTEGER NOT NULL,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),

    CONSTRAINT "asset_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asset_audit_logs_asset_id_idx" ON "public"."asset_audit_logs"("asset_id");

-- CreateIndex
CREATE INDEX "asset_audit_logs_changed_by_idx" ON "public"."asset_audit_logs"("changed_by");

-- CreateIndex
CREATE INDEX "asset_audit_logs_changed_at_idx" ON "public"."asset_audit_logs"("changed_at");

-- CreateIndex
CREATE INDEX "asset_audit_logs_field_name_idx" ON "public"."asset_audit_logs"("field_name");

-- CreateIndex
CREATE INDEX "asset_audit_logs_change_type_idx" ON "public"."asset_audit_logs"("change_type");

-- AddForeignKey
ALTER TABLE "public"."asset_audit_logs" ADD CONSTRAINT "asset_audit_logs_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asset_audit_logs" ADD CONSTRAINT "asset_audit_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

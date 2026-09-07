-- Depreciation fields on assets
CREATE TYPE "DepreciationMethod" AS ENUM ('STRAIGHT_LINE');

ALTER TABLE "assets"
  ADD COLUMN "depreciation_method" "DepreciationMethod",
  ADD COLUMN "useful_life_months" INTEGER,
  ADD COLUMN "salvage_value" DECIMAL(10, 2);

CREATE INDEX "assets_warranty_end_date_idx" ON "assets"("warranty_end_date");

-- Software licenses
CREATE TABLE "software_licenses" (
  "id" SERIAL NOT NULL,
  "tenant_id" INTEGER NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "vendor_name" VARCHAR(100),
  "license_key" VARCHAR(255),
  "seats" INTEGER,
  "purchase_date" DATE,
  "purchase_cost" DECIMAL(10, 2),
  "start_date" DATE,
  "expiry_date" DATE NOT NULL,
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" INTEGER NOT NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "software_licenses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "software_licenses_tenant_id_idx" ON "software_licenses"("tenant_id");
CREATE INDEX "software_licenses_expiry_date_idx" ON "software_licenses"("expiry_date");
CREATE INDEX "software_licenses_is_active_idx" ON "software_licenses"("is_active");
CREATE INDEX "software_licenses_tenant_id_name_idx" ON "software_licenses"("tenant_id", "name");

ALTER TABLE "software_licenses" ADD CONSTRAINT "software_licenses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "software_licenses" ADD CONSTRAINT "software_licenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "software_licenses" ADD CONSTRAINT "software_licenses_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Notification types for warranty / license reminders
ALTER TYPE "NotificationType" ADD VALUE 'WARRANTY_EXPIRING';
ALTER TYPE "NotificationType" ADD VALUE 'WARRANTY_EXPIRED';
ALTER TYPE "NotificationType" ADD VALUE 'LICENSE_EXPIRING';
ALTER TYPE "NotificationType" ADD VALUE 'LICENSE_EXPIRED';

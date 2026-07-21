-- CreateTable
CREATE TABLE "tenants" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
CREATE INDEX "tenants_is_active_idx" ON "tenants"("is_active");

-- Default tenant for existing single-org data
INSERT INTO "tenants" ("name", "slug", "is_active", "created_at", "updated_at")
VALUES ('Mindstix', 'mindstix', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Add nullable tenant_id columns
ALTER TABLE "users" ADD COLUMN "tenant_id" INTEGER;
ALTER TABLE "employees" ADD COLUMN "tenant_id" INTEGER;
ALTER TABLE "asset_categories" ADD COLUMN "tenant_id" INTEGER;
ALTER TABLE "asset_types" ADD COLUMN "tenant_id" INTEGER;
ALTER TABLE "brands" ADD COLUMN "tenant_id" INTEGER;
ALTER TABLE "models" ADD COLUMN "tenant_id" INTEGER;
ALTER TABLE "vendors" ADD COLUMN "tenant_id" INTEGER;
ALTER TABLE "assets" ADD COLUMN "tenant_id" INTEGER;
ALTER TABLE "asset_issues" ADD COLUMN "tenant_id" INTEGER;
ALTER TABLE "maintenance_schedules" ADD COLUMN "tenant_id" INTEGER;
ALTER TABLE "asset_events" ADD COLUMN "tenant_id" INTEGER;
ALTER TABLE "notifications" ADD COLUMN "tenant_id" INTEGER;
ALTER TABLE "audit_logs" ADD COLUMN "tenant_id" INTEGER;

-- Backfill all existing rows to default tenant
UPDATE "users" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mindstix');
UPDATE "employees" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mindstix');
UPDATE "asset_categories" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mindstix');
UPDATE "asset_types" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mindstix');
UPDATE "brands" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mindstix');
UPDATE "models" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mindstix');
UPDATE "vendors" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mindstix');
UPDATE "assets" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mindstix');
UPDATE "asset_issues" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mindstix');
UPDATE "maintenance_schedules" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mindstix');
UPDATE "asset_events" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mindstix');
UPDATE "notifications" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mindstix');
UPDATE "audit_logs" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mindstix');

-- Make tenant_id required
ALTER TABLE "users" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "employees" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "asset_categories" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "asset_types" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "brands" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "models" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "vendors" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "assets" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "asset_issues" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "maintenance_schedules" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "asset_events" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "notifications" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "tenant_id" SET NOT NULL;

-- Drop old global uniqueness that becomes per-tenant
DROP INDEX IF EXISTS "employees_employee_id_key";
DROP INDEX IF EXISTS "asset_categories_name_key";
DROP INDEX IF EXISTS "asset_types_name_category_id_key";
DROP INDEX IF EXISTS "brands_name_key";
DROP INDEX IF EXISTS "models_name_brand_id_asset_type_id_key";
DROP INDEX IF EXISTS "assets_asset_id_key";
DROP INDEX IF EXISTS "assets_serial_number_key";

-- Add FKs to tenants
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_types" ADD CONSTRAINT "asset_types_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "brands" ADD CONSTRAINT "brands_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "models" ADD CONSTRAINT "models_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_issues" ADD CONSTRAINT "asset_issues_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_events" ADD CONSTRAINT "asset_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Per-tenant uniqueness (email remains globally unique)
CREATE UNIQUE INDEX "employees_tenant_id_employee_id_key" ON "employees"("tenant_id", "employee_id");
CREATE UNIQUE INDEX "asset_categories_tenant_id_name_key" ON "asset_categories"("tenant_id", "name");
CREATE UNIQUE INDEX "asset_types_tenant_id_name_category_id_key" ON "asset_types"("tenant_id", "name", "category_id");
CREATE UNIQUE INDEX "brands_tenant_id_name_key" ON "brands"("tenant_id", "name");
CREATE UNIQUE INDEX "models_tenant_id_name_brand_id_asset_type_id_key" ON "models"("tenant_id", "name", "brand_id", "asset_type_id");
CREATE UNIQUE INDEX "assets_tenant_id_asset_id_key" ON "assets"("tenant_id", "asset_id");
CREATE UNIQUE INDEX "assets_tenant_id_serial_number_key" ON "assets"("tenant_id", "serial_number");

-- Tenant indexes
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");
CREATE INDEX "employees_tenant_id_idx" ON "employees"("tenant_id");
CREATE INDEX "asset_categories_tenant_id_idx" ON "asset_categories"("tenant_id");
CREATE INDEX "asset_types_tenant_id_idx" ON "asset_types"("tenant_id");
CREATE INDEX "brands_tenant_id_idx" ON "brands"("tenant_id");
CREATE INDEX "models_tenant_id_idx" ON "models"("tenant_id");
CREATE INDEX "vendors_tenant_id_idx" ON "vendors"("tenant_id");
CREATE INDEX "assets_tenant_id_idx" ON "assets"("tenant_id");
CREATE INDEX "asset_issues_tenant_id_idx" ON "asset_issues"("tenant_id");
CREATE INDEX "maintenance_schedules_tenant_id_idx" ON "maintenance_schedules"("tenant_id");
CREATE INDEX "asset_events_tenant_id_idx" ON "asset_events"("tenant_id");
CREATE INDEX "notifications_tenant_id_idx" ON "notifications"("tenant_id");
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

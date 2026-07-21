-- Add platform flag and backfill from existing slug
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "is_platform" BOOLEAN NOT NULL DEFAULT false;

UPDATE "tenants" SET "is_platform" = true WHERE "slug" = 'platform';

-- Drop slug from tenants
DROP INDEX IF EXISTS "tenants_slug_key";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "slug";

-- Unique organization name
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_name_key" ON "tenants"("name");
CREATE INDEX IF NOT EXISTS "tenants_is_platform_idx" ON "tenants"("is_platform");

-- Drop slug from organization registrations
DROP INDEX IF EXISTS "organization_registrations_slug_idx";
ALTER TABLE "organization_registrations" DROP COLUMN IF EXISTS "slug";

CREATE INDEX IF NOT EXISTS "organization_registrations_organization_name_idx"
  ON "organization_registrations"("organization_name");

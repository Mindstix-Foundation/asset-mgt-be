-- Migration: Update enums (AssetCondition, AssetStatus, ReturnCondition) and convert location to AssetLocation enum
-- Strategy:
--   1. Create new AssetLocation enum
--   2. Drop indexes referencing condition/status (we'll recreate after column type change)
--   3. Create new versions of AssetCondition, AssetStatus, ReturnCondition enums under new names
--   4. Migrate columns to new enum types using mapping logic and a transient text intermediary
--   5. Drop old enums and rename new enums to original names
--   6. Convert assets.location from text to AssetLocation enum (default existing rows to PUNE_INVENTORY_CENTER)
--   7. Recreate indexes
--   8. Set default for assets.status to NON_ASSIGNED

-- =====================================================================================
-- STEP 1: Drop indexes that reference enum-typed columns (safer for type changes)
-- =====================================================================================
DROP INDEX IF EXISTS "public"."assets_status_idx";
DROP INDEX IF EXISTS "public"."assets_condition_idx";
DROP INDEX IF EXISTS "public"."assets_status_condition_idx";
DROP INDEX IF EXISTS "public"."asset_issues_issueCondition_idx";
DROP INDEX IF EXISTS "public"."asset_issues_returnCondition_idx";
DROP INDEX IF EXISTS "public"."asset_issues_issue_condition_idx";
DROP INDEX IF EXISTS "public"."asset_issues_return_condition_idx";

-- =====================================================================================
-- STEP 2: Create new enum types with new names
-- =====================================================================================
CREATE TYPE "AssetLocation" AS ENUM ('PUNE_INVENTORY_CENTER', 'THANE_INVENTORY_CENTER');

CREATE TYPE "AssetCondition_new" AS ENUM (
    'NEW',
    'WORKING_CONDITION',
    'SOFTWARE_ISSUE',
    'HARDWARE_ISSUE',
    'NEEDS_REPAIR',
    'TRASH',
    'REFURBISHED'
);

CREATE TYPE "AssetStatus_new" AS ENUM (
    'NON_ASSIGNED',
    'ASSIGNED',
    'IN_MAINTENANCE',
    'RETIRED',
    'LOST',
    'DONATED'
);

CREATE TYPE "ReturnCondition_new" AS ENUM (
    'WORKING_CONDITION',
    'SOFTWARE_ISSUE',
    'HARDWARE_ISSUE',
    'NEEDS_REPAIR',
    'TRASH',
    'REFURBISHED'
);

-- =====================================================================================
-- STEP 3: Migrate "assets"."condition" column to new enum
-- =====================================================================================
ALTER TABLE "assets" ALTER COLUMN "condition" DROP DEFAULT;
ALTER TABLE "assets" ALTER COLUMN "condition" TYPE "AssetCondition_new"
USING (
    CASE "condition"::text
        WHEN 'NEW' THEN 'NEW'::"AssetCondition_new"
        WHEN 'GOOD' THEN 'WORKING_CONDITION'::"AssetCondition_new"
        WHEN 'FAIR' THEN 'WORKING_CONDITION'::"AssetCondition_new"
        WHEN 'POOR' THEN 'NEEDS_REPAIR'::"AssetCondition_new"
        WHEN 'DAMAGED' THEN 'HARDWARE_ISSUE'::"AssetCondition_new"
        WHEN 'REFURBISHED' THEN 'REFURBISHED'::"AssetCondition_new"
        ELSE 'WORKING_CONDITION'::"AssetCondition_new"
    END
);
ALTER TABLE "assets" ALTER COLUMN "condition" SET DEFAULT 'NEW';

-- =====================================================================================
-- STEP 4: Migrate "asset_issues"."issue_condition" column (also AssetCondition)
-- =====================================================================================
ALTER TABLE "asset_issues" ALTER COLUMN "issue_condition" TYPE "AssetCondition_new"
USING (
    CASE "issue_condition"::text
        WHEN 'NEW' THEN 'NEW'::"AssetCondition_new"
        WHEN 'GOOD' THEN 'WORKING_CONDITION'::"AssetCondition_new"
        WHEN 'FAIR' THEN 'WORKING_CONDITION'::"AssetCondition_new"
        WHEN 'POOR' THEN 'NEEDS_REPAIR'::"AssetCondition_new"
        WHEN 'DAMAGED' THEN 'HARDWARE_ISSUE'::"AssetCondition_new"
        WHEN 'REFURBISHED' THEN 'REFURBISHED'::"AssetCondition_new"
        ELSE NULL
    END
);

-- =====================================================================================
-- STEP 4b: Migrate "asset_condition_history"."condition" column (also AssetCondition)
-- This column was added by the security_features migration and depends on the old
-- AssetCondition enum, so it must be retyped before the old enum can be dropped.
-- =====================================================================================
ALTER TABLE "asset_condition_history" ALTER COLUMN "condition" TYPE "AssetCondition_new"
USING (
    CASE "condition"::text
        WHEN 'NEW' THEN 'NEW'::"AssetCondition_new"
        WHEN 'GOOD' THEN 'WORKING_CONDITION'::"AssetCondition_new"
        WHEN 'FAIR' THEN 'WORKING_CONDITION'::"AssetCondition_new"
        WHEN 'POOR' THEN 'NEEDS_REPAIR'::"AssetCondition_new"
        WHEN 'DAMAGED' THEN 'HARDWARE_ISSUE'::"AssetCondition_new"
        WHEN 'REFURBISHED' THEN 'REFURBISHED'::"AssetCondition_new"
        ELSE 'WORKING_CONDITION'::"AssetCondition_new"
    END
);

-- =====================================================================================
-- STEP 5: Migrate "asset_issues"."return_condition" column (ReturnCondition)
-- =====================================================================================
ALTER TABLE "asset_issues" ALTER COLUMN "return_condition" TYPE "ReturnCondition_new"
USING (
    CASE "return_condition"::text
        WHEN 'GOOD' THEN 'WORKING_CONDITION'::"ReturnCondition_new"
        WHEN 'FAIR' THEN 'WORKING_CONDITION'::"ReturnCondition_new"
        WHEN 'POOR' THEN 'NEEDS_REPAIR'::"ReturnCondition_new"
        WHEN 'DAMAGED' THEN 'HARDWARE_ISSUE'::"ReturnCondition_new"
        WHEN 'REFURBISHED' THEN 'REFURBISHED'::"ReturnCondition_new"
        ELSE NULL
    END
);

-- =====================================================================================
-- STEP 6: Migrate "assets"."status" column (AssetStatus)
-- =====================================================================================
ALTER TABLE "assets" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "assets" ALTER COLUMN "status" TYPE "AssetStatus_new"
USING (
    CASE "status"::text
        WHEN 'AVAILABLE' THEN 'NON_ASSIGNED'::"AssetStatus_new"
        WHEN 'ASSIGNED' THEN 'ASSIGNED'::"AssetStatus_new"
        WHEN 'IN_MAINTENANCE' THEN 'IN_MAINTENANCE'::"AssetStatus_new"
        WHEN 'RETIRED' THEN 'RETIRED'::"AssetStatus_new"
        WHEN 'LOST' THEN 'LOST'::"AssetStatus_new"
        ELSE 'NON_ASSIGNED'::"AssetStatus_new"
    END
);
ALTER TABLE "assets" ALTER COLUMN "status" SET DEFAULT 'NON_ASSIGNED';

-- =====================================================================================
-- STEP 6b: Migrate "asset_status_history"."status" column (also AssetStatus)
-- This column was added by the security_features migration and depends on the old
-- AssetStatus enum, so it must be retyped before the old enum can be dropped.
-- =====================================================================================
ALTER TABLE "asset_status_history" ALTER COLUMN "status" TYPE "AssetStatus_new"
USING (
    CASE "status"::text
        WHEN 'AVAILABLE' THEN 'NON_ASSIGNED'::"AssetStatus_new"
        WHEN 'ASSIGNED' THEN 'ASSIGNED'::"AssetStatus_new"
        WHEN 'IN_MAINTENANCE' THEN 'IN_MAINTENANCE'::"AssetStatus_new"
        WHEN 'RETIRED' THEN 'RETIRED'::"AssetStatus_new"
        WHEN 'LOST' THEN 'LOST'::"AssetStatus_new"
        ELSE 'NON_ASSIGNED'::"AssetStatus_new"
    END
);

-- =====================================================================================
-- STEP 7: Drop old enum types and rename new ones to original names
-- =====================================================================================
DROP TYPE "AssetCondition";
ALTER TYPE "AssetCondition_new" RENAME TO "AssetCondition";

DROP TYPE "AssetStatus";
ALTER TYPE "AssetStatus_new" RENAME TO "AssetStatus";

DROP TYPE "ReturnCondition";
ALTER TYPE "ReturnCondition_new" RENAME TO "ReturnCondition";

-- =====================================================================================
-- STEP 8: Convert "assets"."location" from text to AssetLocation enum
-- All existing free-text locations are mapped to PUNE_INVENTORY_CENTER
-- =====================================================================================
ALTER TABLE "assets" ALTER COLUMN "location" TYPE "AssetLocation"
USING (
    CASE
        WHEN "location" IS NULL THEN NULL
        WHEN UPPER("location") LIKE '%THANE%' THEN 'THANE_INVENTORY_CENTER'::"AssetLocation"
        ELSE 'PUNE_INVENTORY_CENTER'::"AssetLocation"
    END
);

-- =====================================================================================
-- STEP 9: Recreate indexes that were dropped at the start
-- =====================================================================================
CREATE INDEX "assets_status_idx" ON "assets"("status");
CREATE INDEX "assets_condition_idx" ON "assets"("condition");
CREATE INDEX "assets_status_condition_idx" ON "assets"("status", "condition");
CREATE INDEX "asset_issues_issue_condition_idx" ON "asset_issues"("issue_condition");
CREATE INDEX "asset_issues_return_condition_idx" ON "asset_issues"("return_condition");

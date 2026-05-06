-- Sync database with the current Prisma schema.
--
-- Several columns and tables declared in schema.prisma were never backed by a
-- migration. This caused seeds and runtime queries to fail with P2022
-- ("column does not exist"). We add them here.
--
-- Items covered (all idempotent / additive):
--   1. asset_types.specification_template (JSONB)
--   2. assets.specifications              (JSONB)
--   3. employees.employee_id              (-> CHAR(8) for fixed-width staff IDs)
--   4. NotificationType enum + notifications table
--
-- We deliberately do NOT drop asset_condition_history / asset_status_history
-- in this migration. Even though the schema no longer declares them, dropping
-- them is destructive and orthogonal to seeding; keeping them around is a
-- no-op for the running app.

-- 1. asset_types.specification_template
ALTER TABLE "asset_types"
  ADD COLUMN IF NOT EXISTS "specification_template" JSONB;

-- 2. assets.specifications
ALTER TABLE "assets"
  ADD COLUMN IF NOT EXISTS "specifications" JSONB;

-- 3. employees.employee_id -> fixed-width CHAR(8)
ALTER TABLE "employees"
  ALTER COLUMN "employee_id" TYPE CHAR(8);

-- 4. NotificationType enum + notifications table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
    CREATE TYPE "NotificationType" AS ENUM (
      'MAINTENANCE_REMINDER',
      'MAINTENANCE_OVERDUE',
      'ASSET_ASSIGNED',
      'ASSET_RETURNED',
      'SYSTEM_ALERT'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id"         SERIAL                   NOT NULL,
  "user_id"    INTEGER                  NOT NULL,
  "type"       "NotificationType"       NOT NULL,
  "title"      VARCHAR(200)             NOT NULL,
  "message"    TEXT                     NOT NULL,
  "is_read"    BOOLEAN                  NOT NULL DEFAULT false,
  "data"       JSONB,
  "created_at" TIMESTAMPTZ(6)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "read_at"    TIMESTAMPTZ(6),
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notifications_user_id_idx"     ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_type_idx"        ON "notifications" ("type");
CREATE INDEX IF NOT EXISTS "notifications_is_read_idx"     ON "notifications" ("is_read");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx"  ON "notifications" ("created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_fkey'
  ) THEN
    ALTER TABLE "notifications"
      ADD CONSTRAINT "notifications_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END$$;

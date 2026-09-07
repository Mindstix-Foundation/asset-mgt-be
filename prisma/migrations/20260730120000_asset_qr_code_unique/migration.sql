-- Backfill missing QR tokens for existing assets
UPDATE "assets"
SET "qr_code" = gen_random_uuid()::text
WHERE "qr_code" IS NULL;

-- Drop non-unique index if it exists (replaced by unique constraint)
DROP INDEX IF EXISTS "assets_qr_code_idx";

-- Enforce uniqueness for public lookup by token
CREATE UNIQUE INDEX "assets_qr_code_key" ON "assets"("qr_code");

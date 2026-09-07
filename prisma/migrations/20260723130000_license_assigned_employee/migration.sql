-- Assign each software license to a responsible employee
ALTER TABLE "software_licenses" ADD COLUMN "assigned_to_id" INTEGER;

-- Backfill: prefer ACTIVE employee in the same tenant
UPDATE "software_licenses" AS sl
SET "assigned_to_id" = (
  SELECT e."id"
  FROM "employees" e
  WHERE e."tenant_id" = sl."tenant_id"
    AND e."status" = 'ACTIVE'
  ORDER BY e."id" ASC
  LIMIT 1
)
WHERE sl."assigned_to_id" IS NULL;

-- Fallback: any employee in tenant
UPDATE "software_licenses" AS sl
SET "assigned_to_id" = (
  SELECT e."id"
  FROM "employees" e
  WHERE e."tenant_id" = sl."tenant_id"
  ORDER BY e."id" ASC
  LIMIT 1
)
WHERE sl."assigned_to_id" IS NULL;

ALTER TABLE "software_licenses" ALTER COLUMN "assigned_to_id" SET NOT NULL;

CREATE INDEX "software_licenses_assigned_to_id_idx" ON "software_licenses"("assigned_to_id");

ALTER TABLE "software_licenses"
  ADD CONSTRAINT "software_licenses_assigned_to_id_fkey"
  FOREIGN KEY ("assigned_to_id") REFERENCES "employees"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

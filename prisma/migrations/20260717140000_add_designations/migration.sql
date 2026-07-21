-- CreateTable
CREATE TABLE "designations" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "designations_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "employees" ADD COLUMN "designation_id" INTEGER;

-- CreateIndex
CREATE INDEX "designations_tenant_id_idx" ON "designations"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "designations_tenant_id_name_key" ON "designations"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "employees_designation_id_idx" ON "employees"("designation_id");

-- AddForeignKey
ALTER TABLE "designations" ADD CONSTRAINT "designations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designations" ADD CONSTRAINT "designations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designations" ADD CONSTRAINT "designations_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

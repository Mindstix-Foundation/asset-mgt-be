-- CreateEnum
CREATE TYPE "OrganizationRegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "organization_registrations" (
    "id" SERIAL NOT NULL,
    "organization_name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "admin_first_name" VARCHAR(50) NOT NULL,
    "admin_last_name" VARCHAR(50) NOT NULL,
    "admin_email" VARCHAR(255) NOT NULL,
    "admin_username" VARCHAR(50) NOT NULL,
    "admin_password_hash" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "message" VARCHAR(500),
    "status" "OrganizationRegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" VARCHAR(500),
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMPTZ(6),
    "tenant_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_registrations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "organization_registrations_status_idx" ON "organization_registrations"("status");
CREATE INDEX "organization_registrations_slug_idx" ON "organization_registrations"("slug");
CREATE INDEX "organization_registrations_admin_email_idx" ON "organization_registrations"("admin_email");

ALTER TABLE "organization_registrations"
ADD CONSTRAINT "organization_registrations_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

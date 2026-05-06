-- CreateEnum
CREATE TYPE "public"."AssetCondition" AS ENUM ('NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED');

-- CreateEnum
CREATE TYPE "public"."AssetStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'IN_MAINTENANCE', 'RETIRED', 'LOST');

-- CreateEnum
CREATE TYPE "public"."MaintenanceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ReturnCondition" AS ENUM ('GOOD', 'FAIR', 'POOR', 'DAMAGED');

-- CreateEnum
CREATE TYPE "public"."EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."VendorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."MaintenanceTypeEnum" AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'EMERGENCY', 'UPGRADE');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMPTZ,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."roles" (
    "id" SERIAL NOT NULL,
    "role_name" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_roles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "assigned_by" INTEGER NOT NULL,
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employees" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(20) NOT NULL,
    "first_name" VARCHAR(50) NOT NULL,
    "last_name" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(15),
    "date_of_birth" DATE,
    "address" TEXT,
    "status" "public"."EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."asset_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."asset_types" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."brands" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."models" (
    "id" SERIAL NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "asset_type_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "specifications" JSONB,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vendors" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "vendor_type" VARCHAR(20) NOT NULL DEFAULT 'supplier',
    "contact_person" VARCHAR(100),
    "email" VARCHAR(255),
    "phone" VARCHAR(15),
    "address" TEXT,
    "tax_id" VARCHAR(50),
    "pan_number" VARCHAR(10),
    "notes" TEXT,
    "user_id" INTEGER,
    "status" "public"."VendorStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assets" (
    "id" SERIAL NOT NULL,
    "asset_id" VARCHAR(20) NOT NULL,
    "asset_type_id" INTEGER NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "model_id" INTEGER NOT NULL,
    "serial_number" VARCHAR(100),
    "purchase_date" DATE,
    "purchase_cost" DECIMAL(10,2),
    "vendor_id" INTEGER,
    "warranty_start_date" DATE,
    "warranty_end_date" DATE,
    "location" TEXT,
    "condition" "public"."AssetCondition" NOT NULL DEFAULT 'NEW',
    "status" "public"."AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "retirement_date" DATE,
    "retirement_reason" TEXT,
    "reactivation_date" DATE,
    "reactivation_reason" TEXT,
    "qr_code" VARCHAR(255),
    "image_url" VARCHAR(500),
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."asset_issues" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "issued_by" INTEGER NOT NULL,
    "issue_date" DATE NOT NULL,
    "issue_condition" "public"."AssetCondition",
    "return_date" DATE,
    "return_condition" "public"."ReturnCondition",
    "issue_reason" VARCHAR(100),
    "return_reason" VARCHAR(100),
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."maintenance_schedules" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "maintenance_type" "public"."MaintenanceTypeEnum" NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "frequency_days" INTEGER,
    "description" TEXT NOT NULL,
    "estimated_cost" DECIMAL(10,2),
    "vendor_id" INTEGER,
    "status" "public"."MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "actual_start_date" DATE,
    "actual_completion_date" DATE,
    "actual_cost" DECIMAL(10,2),
    "completion_notes" TEXT,
    "cancellation_date" DATE,
    "cancellation_reason" TEXT,
    "cancellation_notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_id_key" ON "public"."users"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE INDEX "users_is_active_last_login_idx" ON "public"."users"("is_active", "last_login");

-- CreateIndex
CREATE UNIQUE INDEX "roles_role_name_key" ON "public"."roles"("role_name");

-- CreateIndex
CREATE INDEX "roles_is_active_idx" ON "public"."roles"("is_active");

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "public"."user_roles"("user_id");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "public"."user_roles"("role_id");

-- CreateIndex
CREATE INDEX "user_roles_assigned_by_idx" ON "public"."user_roles"("assigned_by");

-- CreateIndex
CREATE INDEX "user_roles_is_active_idx" ON "public"."user_roles"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "public"."user_roles"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employee_id_key" ON "public"."employees"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "public"."employees"("email");

-- CreateIndex
CREATE INDEX "employees_status_idx" ON "public"."employees"("status");

-- CreateIndex
CREATE INDEX "employees_first_name_last_name_idx" ON "public"."employees"("first_name", "last_name");

-- CreateIndex
CREATE UNIQUE INDEX "asset_categories_name_key" ON "public"."asset_categories"("name");

-- CreateIndex
CREATE INDEX "asset_types_category_id_idx" ON "public"."asset_types"("category_id");

-- CreateIndex
CREATE INDEX "asset_types_is_active_idx" ON "public"."asset_types"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "asset_types_name_category_id_key" ON "public"."asset_types"("name", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_key" ON "public"."brands"("name");

-- CreateIndex
CREATE INDEX "models_brand_id_idx" ON "public"."models"("brand_id");

-- CreateIndex
CREATE INDEX "models_asset_type_id_idx" ON "public"."models"("asset_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "models_name_brand_id_asset_type_id_key" ON "public"."models"("name", "brand_id", "asset_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_user_id_key" ON "public"."vendors"("user_id");

-- CreateIndex
CREATE INDEX "vendors_name_idx" ON "public"."vendors"("name");

-- CreateIndex
CREATE INDEX "vendors_vendor_type_idx" ON "public"."vendors"("vendor_type");

-- CreateIndex
CREATE INDEX "vendors_email_idx" ON "public"."vendors"("email");

-- CreateIndex
CREATE INDEX "vendors_tax_id_idx" ON "public"."vendors"("tax_id");

-- CreateIndex
CREATE INDEX "vendors_pan_number_idx" ON "public"."vendors"("pan_number");

-- CreateIndex
CREATE INDEX "vendors_status_idx" ON "public"."vendors"("status");

-- CreateIndex
CREATE UNIQUE INDEX "assets_asset_id_key" ON "public"."assets"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "assets_serial_number_key" ON "public"."assets"("serial_number");

-- CreateIndex
CREATE INDEX "assets_asset_type_id_idx" ON "public"."assets"("asset_type_id");

-- CreateIndex
CREATE INDEX "assets_brand_id_idx" ON "public"."assets"("brand_id");

-- CreateIndex
CREATE INDEX "assets_model_id_idx" ON "public"."assets"("model_id");

-- CreateIndex
CREATE INDEX "assets_vendor_id_idx" ON "public"."assets"("vendor_id");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "public"."assets"("status");

-- CreateIndex
CREATE INDEX "assets_condition_idx" ON "public"."assets"("condition");

-- CreateIndex
CREATE INDEX "assets_status_condition_idx" ON "public"."assets"("status", "condition");

-- CreateIndex
CREATE INDEX "assets_retirement_date_idx" ON "public"."assets"("retirement_date");

-- CreateIndex
CREATE INDEX "assets_reactivation_date_idx" ON "public"."assets"("reactivation_date");

-- CreateIndex
CREATE INDEX "assets_qr_code_idx" ON "public"."assets"("qr_code");

-- CreateIndex
CREATE INDEX "asset_issues_asset_id_idx" ON "public"."asset_issues"("asset_id");

-- CreateIndex
CREATE INDEX "asset_issues_employee_id_idx" ON "public"."asset_issues"("employee_id");

-- CreateIndex
CREATE INDEX "asset_issues_issued_by_idx" ON "public"."asset_issues"("issued_by");

-- CreateIndex
CREATE INDEX "asset_issues_issue_date_idx" ON "public"."asset_issues"("issue_date");

-- CreateIndex
CREATE INDEX "asset_issues_issue_condition_idx" ON "public"."asset_issues"("issue_condition");

-- CreateIndex
CREATE INDEX "asset_issues_return_condition_idx" ON "public"."asset_issues"("return_condition");

-- CreateIndex
CREATE INDEX "maintenance_schedules_asset_id_idx" ON "public"."maintenance_schedules"("asset_id");

-- CreateIndex
CREATE INDEX "maintenance_schedules_maintenance_type_idx" ON "public"."maintenance_schedules"("maintenance_type");

-- CreateIndex
CREATE INDEX "maintenance_schedules_vendor_id_idx" ON "public"."maintenance_schedules"("vendor_id");

-- CreateIndex
CREATE INDEX "maintenance_schedules_scheduled_date_idx" ON "public"."maintenance_schedules"("scheduled_date");

-- CreateIndex
CREATE INDEX "maintenance_schedules_status_idx" ON "public"."maintenance_schedules"("status");

-- CreateIndex
CREATE INDEX "maintenance_schedules_is_active_idx" ON "public"."maintenance_schedules"("is_active");

-- CreateIndex
CREATE INDEX "maintenance_schedules_actual_completion_date_idx" ON "public"."maintenance_schedules"("actual_completion_date");

-- CreateIndex
CREATE INDEX "maintenance_schedules_cancellation_date_idx" ON "public"."maintenance_schedules"("cancellation_date");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."roles" ADD CONSTRAINT "roles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."roles" ADD CONSTRAINT "roles_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asset_categories" ADD CONSTRAINT "asset_categories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asset_categories" ADD CONSTRAINT "asset_categories_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asset_types" ADD CONSTRAINT "asset_types_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."asset_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asset_types" ADD CONSTRAINT "asset_types_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asset_types" ADD CONSTRAINT "asset_types_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."brands" ADD CONSTRAINT "brands_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."brands" ADD CONSTRAINT "brands_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."models" ADD CONSTRAINT "models_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."models" ADD CONSTRAINT "models_asset_type_id_fkey" FOREIGN KEY ("asset_type_id") REFERENCES "public"."asset_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."models" ADD CONSTRAINT "models_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."models" ADD CONSTRAINT "models_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendors" ADD CONSTRAINT "vendors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendors" ADD CONSTRAINT "vendors_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendors" ADD CONSTRAINT "vendors_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assets" ADD CONSTRAINT "assets_asset_type_id_fkey" FOREIGN KEY ("asset_type_id") REFERENCES "public"."asset_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assets" ADD CONSTRAINT "assets_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assets" ADD CONSTRAINT "assets_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assets" ADD CONSTRAINT "assets_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assets" ADD CONSTRAINT "assets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assets" ADD CONSTRAINT "assets_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asset_issues" ADD CONSTRAINT "asset_issues_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asset_issues" ADD CONSTRAINT "asset_issues_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asset_issues" ADD CONSTRAINT "asset_issues_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asset_issues" ADD CONSTRAINT "asset_issues_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asset_issues" ADD CONSTRAINT "asset_issues_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

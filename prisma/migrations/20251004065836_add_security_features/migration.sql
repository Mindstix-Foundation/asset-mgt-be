/*
  Warnings:

  - You are about to drop the column `vendor_id` on the `maintenance_schedules` table. All the data in the column will be lost.
  - You are about to drop the `asset_audit_logs` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."AssetEventType" AS ENUM ('ASSET_CREATED', 'ASSET_UPDATED', 'ASSET_RETIRED', 'ASSET_REACTIVATED', 'ASSET_ISSUED', 'ASSET_COLLECTED', 'MAINTENANCE_SCHEDULED', 'MAINTENANCE_UPDATED', 'MAINTENANCE_COMPLETED', 'MAINTENANCE_CANCELLED');

-- DropForeignKey
ALTER TABLE "public"."asset_audit_logs" DROP CONSTRAINT "asset_audit_logs_asset_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."asset_audit_logs" DROP CONSTRAINT "asset_audit_logs_changed_by_fkey";

-- DropForeignKey
ALTER TABLE "public"."maintenance_schedules" DROP CONSTRAINT "maintenance_schedules_vendor_id_fkey";

-- DropIndex
DROP INDEX "public"."maintenance_schedules_vendor_id_idx";

-- AlterTable
ALTER TABLE "public"."asset_issues" ADD COLUMN     "issue_timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "return_timestamp" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "public"."maintenance_schedules" DROP COLUMN "vendor_id",
ALTER COLUMN "scheduled_date" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "actual_start_date" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "actual_completion_date" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "cancellation_date" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "locked_until" TIMESTAMPTZ(6),
ADD COLUMN     "refresh_token" VARCHAR(500),
ADD COLUMN     "refresh_token_expires" TIMESTAMPTZ(6),
ADD COLUMN     "roles" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DropTable
DROP TABLE "public"."asset_audit_logs";

-- DropEnum
DROP TYPE "public"."AuditChangeType";

-- CreateTable
CREATE TABLE "public"."password_resets" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."blacklisted_tokens" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blacklisted_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refresh_sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "device_id" VARCHAR(255),
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."asset_events" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "event_type" "public"."AssetEventType" NOT NULL,
    "event_date" TIMESTAMPTZ(6) NOT NULL,
    "performed_by" INTEGER NOT NULL,
    "field_name" VARCHAR(50),
    "old_value" VARCHAR(500),
    "new_value" VARCHAR(500),
    "metadata" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."asset_status_history" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "status" "public"."AssetStatus" NOT NULL,
    "effective_from" TIMESTAMPTZ(6) NOT NULL,
    "effective_to" TIMESTAMPTZ(6),
    "set_by" INTEGER NOT NULL,
    "reason" VARCHAR(500),
    "notes" TEXT,

    CONSTRAINT "asset_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."asset_condition_history" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "condition" "public"."AssetCondition" NOT NULL,
    "effective_from" TIMESTAMPTZ(6) NOT NULL,
    "effective_to" TIMESTAMPTZ(6),
    "set_by" INTEGER NOT NULL,
    "reason" VARCHAR(500),
    "notes" TEXT,

    CONSTRAINT "asset_condition_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_key" ON "public"."password_resets"("token");

-- CreateIndex
CREATE INDEX "password_resets_token_used_expires_at_idx" ON "public"."password_resets"("token", "used", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "blacklisted_tokens_token_key" ON "public"."blacklisted_tokens"("token");

-- CreateIndex
CREATE INDEX "blacklisted_tokens_token_expires_at_idx" ON "public"."blacklisted_tokens"("token", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_sessions_token_key" ON "public"."refresh_sessions"("token");

-- CreateIndex
CREATE INDEX "refresh_sessions_user_id_expires_at_idx" ON "public"."refresh_sessions"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "refresh_sessions_token_expires_at_idx" ON "public"."refresh_sessions"("token", "expires_at");

-- CreateIndex
CREATE INDEX "asset_events_asset_id_idx" ON "public"."asset_events"("asset_id");

-- CreateIndex
CREATE INDEX "asset_events_event_type_idx" ON "public"."asset_events"("event_type");

-- CreateIndex
CREATE INDEX "asset_events_event_date_idx" ON "public"."asset_events"("event_date");

-- CreateIndex
CREATE INDEX "asset_events_performed_by_idx" ON "public"."asset_events"("performed_by");

-- CreateIndex
CREATE INDEX "asset_events_field_name_idx" ON "public"."asset_events"("field_name");

-- CreateIndex
CREATE INDEX "asset_status_history_asset_id_idx" ON "public"."asset_status_history"("asset_id");

-- CreateIndex
CREATE INDEX "asset_status_history_status_idx" ON "public"."asset_status_history"("status");

-- CreateIndex
CREATE INDEX "asset_status_history_effective_from_idx" ON "public"."asset_status_history"("effective_from");

-- CreateIndex
CREATE INDEX "asset_condition_history_asset_id_idx" ON "public"."asset_condition_history"("asset_id");

-- CreateIndex
CREATE INDEX "asset_condition_history_condition_idx" ON "public"."asset_condition_history"("condition");

-- CreateIndex
CREATE INDEX "asset_condition_history_effective_from_idx" ON "public"."asset_condition_history"("effective_from");

-- CreateIndex
CREATE INDEX "asset_issues_issue_timestamp_idx" ON "public"."asset_issues"("issue_timestamp");

-- CreateIndex
CREATE INDEX "asset_issues_return_date_idx" ON "public"."asset_issues"("return_date");

-- CreateIndex
CREATE INDEX "asset_issues_return_timestamp_idx" ON "public"."asset_issues"("return_timestamp");

-- AddForeignKey
ALTER TABLE "public"."password_resets" ADD CONSTRAINT "password_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refresh_sessions" ADD CONSTRAINT "refresh_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asset_events" ADD CONSTRAINT "asset_events_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asset_events" ADD CONSTRAINT "asset_events_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asset_status_history" ADD CONSTRAINT "asset_status_history_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asset_status_history" ADD CONSTRAINT "asset_status_history_set_by_fkey" FOREIGN KEY ("set_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asset_condition_history" ADD CONSTRAINT "asset_condition_history_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asset_condition_history" ADD CONSTRAINT "asset_condition_history_set_by_fkey" FOREIGN KEY ("set_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "public"."AuditAction" AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" SERIAL NOT NULL,
    "table_name" VARCHAR(50) NOT NULL,
    "record_id" INTEGER NOT NULL,
    "action" "public"."AuditAction" NOT NULL,
    "entity_label" VARCHAR(255),
    "summary" VARCHAR(500),
    "old_values" JSONB,
    "new_values" JSONB,
    "changed_fields" TEXT[],
    "metadata" JSONB,
    "user_id" INTEGER NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_table_name_record_id_idx" ON "public"."audit_logs"("table_name", "record_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "public"."audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "public"."audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "public"."audit_logs"("action");

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

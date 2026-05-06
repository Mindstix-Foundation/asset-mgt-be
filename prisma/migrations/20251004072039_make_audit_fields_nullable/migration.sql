-- DropForeignKey
ALTER TABLE "public"."employees" DROP CONSTRAINT "employees_created_by_fkey";

-- DropForeignKey
ALTER TABLE "public"."employees" DROP CONSTRAINT "employees_updated_by_fkey";

-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_created_by_fkey";

-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_updated_by_fkey";

-- AlterTable
ALTER TABLE "public"."employees" ALTER COLUMN "created_by" DROP NOT NULL,
ALTER COLUMN "updated_by" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."users" ALTER COLUMN "created_by" DROP NOT NULL,
ALTER COLUMN "updated_by" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

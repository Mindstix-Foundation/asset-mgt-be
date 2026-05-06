/*
  Warnings:

  - You are about to drop the column `created_by` on the `roles` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `roles` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."roles" DROP CONSTRAINT "roles_created_by_fkey";

-- DropForeignKey
ALTER TABLE "public"."roles" DROP CONSTRAINT "roles_updated_by_fkey";

-- AlterTable
ALTER TABLE "public"."roles" DROP COLUMN "created_by",
DROP COLUMN "updated_by";

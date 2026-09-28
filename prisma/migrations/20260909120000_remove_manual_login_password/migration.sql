-- Remove manual/password-based auth in favour of Google SSO only.
-- Drops the password reset table and the password hash column on users.

-- DropForeignKey
ALTER TABLE "password_resets" DROP CONSTRAINT IF EXISTS "password_resets_user_id_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash";

-- DropTable
DROP TABLE IF EXISTS "password_resets";

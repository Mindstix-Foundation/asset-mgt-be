-- Remove username permanently; identity is Google email via Employee.
DROP INDEX IF EXISTS "users_username_key";
ALTER TABLE "users" DROP COLUMN IF EXISTS "username";

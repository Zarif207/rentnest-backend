-- AlterEnum
-- A read-only reviewer role. Additive: no existing row changes. Adding an
-- enum value inside the migration's transaction is fine on PostgreSQL 12+
-- as long as the value isn't used in the same transaction.
ALTER TYPE "UserRole" ADD VALUE 'OBSERVER';

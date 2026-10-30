-- CreateEnum
CREATE TYPE "LandlordStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "landlordStatus" "LandlordStatus";

-- Existing landlords were already active before approval existed: keep them working.
UPDATE "User" SET "landlordStatus" = 'APPROVED' WHERE "role" = 'LANDLORD';

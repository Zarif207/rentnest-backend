-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('RENT', 'SALE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AvailabilityStatus" ADD VALUE 'UNDER_CONTRACT';
ALTER TYPE "AvailabilityStatus" ADD VALUE 'SOLD';

-- AlterTable
-- Existing rows become RENT listings (the default) and keep their rent.
ALTER TABLE "Property" ADD COLUMN     "listingType" "ListingType" NOT NULL DEFAULT 'RENT',
ADD COLUMN     "salePrice" DECIMAL(65,30),
ALTER COLUMN "rentAmount" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Property_listingType_idx" ON "Property"("listingType");

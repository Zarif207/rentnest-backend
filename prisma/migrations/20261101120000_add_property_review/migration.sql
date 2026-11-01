-- CreateEnum
CREATE TYPE "PropertyReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- Adding enum values inside the migration's transaction is fine on
-- PostgreSQL 12+ as long as they aren't used in the same transaction.
ALTER TYPE "NotificationType" ADD VALUE 'PROPERTY_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'PROPERTY_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'PROPERTY_REJECTED';

-- AlterTable
-- Every existing listing is already public, so it's added as APPROVED; the
-- default then becomes PENDING so only new listings wait for review.
ALTER TABLE "Property" ADD COLUMN     "reviewStatus" "PropertyReviewStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT;

ALTER TABLE "Property" ALTER COLUMN "reviewStatus" SET DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Property_reviewStatus_idx" ON "Property"("reviewStatus");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'OFFER_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'OFFER_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'OFFER_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'OFFER_COUNTERED';
ALTER TYPE "NotificationType" ADD VALUE 'OFFER_WITHDRAWN';
ALTER TYPE "NotificationType" ADD VALUE 'DEPOSIT_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'DEPOSIT_PAID';
ALTER TYPE "NotificationType" ADD VALUE 'SALE_COMPLETED';

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'COUNTERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'DEPOSIT_PAID', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OfferFinancing" AS ENUM ('CASH', 'MORTGAGE', 'OTHER');

-- CreateTable
CREATE TABLE "PurchaseOffer" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "offerAmount" DECIMAL(65,30) NOT NULL,
    "counterAmount" DECIMAL(65,30),
    "agreedAmount" DECIMAL(65,30),
    "financing" "OfferFinancing" NOT NULL,
    "message" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseOffer_propertyId_idx" ON "PurchaseOffer"("propertyId");

-- CreateIndex
CREATE INDEX "PurchaseOffer_buyerId_idx" ON "PurchaseOffer"("buyerId");

-- CreateIndex
CREATE INDEX "PurchaseOffer_status_idx" ON "PurchaseOffer"("status");

-- AddForeignKey
ALTER TABLE "PurchaseOffer" ADD CONSTRAINT "PurchaseOffer_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOffer" ADD CONSTRAINT "PurchaseOffer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

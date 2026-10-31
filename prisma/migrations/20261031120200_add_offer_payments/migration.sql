-- CreateTable
CREATE TABLE "OfferPayment" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OfferPayment_offerId_key" ON "OfferPayment"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "OfferPayment_transactionId_key" ON "OfferPayment"("transactionId");

-- AddForeignKey
ALTER TABLE "OfferPayment" ADD CONSTRAINT "OfferPayment_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "PurchaseOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

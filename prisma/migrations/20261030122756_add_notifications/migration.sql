-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('LANDLORD_REGISTERED', 'LANDLORD_APPROVED', 'LANDLORD_REJECTED', 'RENTAL_REQUESTED', 'RENTAL_APPROVED', 'RENTAL_REJECTED', 'PAYMENT_RECEIVED', 'PAYMENT_SUCCESS', 'RENTAL_COMPLETED', 'REVIEW_RECEIVED', 'ACCOUNT_BLOCKED', 'ACCOUNT_UNBLOCKED');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

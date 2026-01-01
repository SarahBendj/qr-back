/*
  Warnings:

  - You are about to drop the column `paymentTypeId` on the `Payment` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Payment_paymentTypeId_key";

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "PaymentId" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "PaymentId" TEXT;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "paymentTypeId";

-- AlterTable
ALTER TABLE "Portfolio" ADD COLUMN     "PaymentId" TEXT,
ADD COLUMN     "isPaid" BOOLEAN NOT NULL DEFAULT false;

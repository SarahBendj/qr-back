/*
  Warnings:

  - You are about to drop the column `PaymentId` on the `Candidate` table. All the data in the column will be lost.
  - You are about to drop the column `PaymentId` on the `Event` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[productId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `productId` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Candidate" DROP COLUMN "PaymentId";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "PaymentId";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "productId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_productId_key" ON "Payment"("productId");

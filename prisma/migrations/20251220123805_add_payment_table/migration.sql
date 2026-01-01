/*
  Warnings:

  - A unique constraint covering the columns `[paymentTypeId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `paymentTypeId` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "paymentTypeId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paymentTypeId_key" ON "Payment"("paymentTypeId");

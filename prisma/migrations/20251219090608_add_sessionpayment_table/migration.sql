/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `PaymentSession` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PaymentSession" ADD COLUMN     "token" TEXT NOT NULL DEFAULT gen_random_uuid();

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSession_token_key" ON "PaymentSession"("token");

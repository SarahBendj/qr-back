/*
  Warnings:

  - A unique constraint covering the columns `[accessCode]` on the table `Candidate` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[accessCode]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "accessCode" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "accessCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_accessCode_key" ON "Candidate"("accessCode");

-- CreateIndex
CREATE UNIQUE INDEX "Event_accessCode_key" ON "Event"("accessCode");

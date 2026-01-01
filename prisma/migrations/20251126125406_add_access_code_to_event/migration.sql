/*
  Warnings:

  - You are about to drop the column `accessCode` on the `Candidate` table. All the data in the column will be lost.
  - You are about to drop the column `accessCode` on the `Event` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Candidate_accessCode_key";

-- DropIndex
DROP INDEX "public"."Event_accessCode_key";

-- AlterTable
ALTER TABLE "Candidate" DROP COLUMN "accessCode";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "accessCode";

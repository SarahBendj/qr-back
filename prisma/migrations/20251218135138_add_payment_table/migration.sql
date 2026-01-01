-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "isPrivatePaid" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "isPrivatePaid" BOOLEAN NOT NULL DEFAULT false;

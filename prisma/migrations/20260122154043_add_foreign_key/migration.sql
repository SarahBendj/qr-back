-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "capacity" TEXT;

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "confirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "email" TEXT;

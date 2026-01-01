-- DropForeignKey
ALTER TABLE "public"."EventLink" DROP CONSTRAINT "EventLink_eventId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Link" DROP CONSTRAINT "Link_candidateId_fkey";

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLink" ADD CONSTRAINT "EventLink_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

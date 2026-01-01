-- DropForeignKey
ALTER TABLE "public"."EventLink" DROP CONSTRAINT "EventLink_eventId_fkey";

-- AddForeignKey
ALTER TABLE "EventLink" ADD CONSTRAINT "EventLink_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "public"."Project" DROP CONSTRAINT "Project_portfolioId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SoftSkill" DROP CONSTRAINT "SoftSkill_portfolioId_fkey";

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoftSkill" ADD CONSTRAINT "SoftSkill_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

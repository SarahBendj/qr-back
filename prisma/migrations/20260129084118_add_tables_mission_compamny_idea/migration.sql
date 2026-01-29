/*
  Mission: move from Candidate to Portfolio (only portfolio candidates have missions).
  - Add portfolioId, backfill from candidate's portfolio, then drop candidateId.
*/
-- Add new column (nullable first for backfill)
ALTER TABLE "Mission" ADD COLUMN "portfolioId" TEXT;

-- Backfill: set portfolioId from candidate's portfolio
UPDATE "Mission" m
SET "portfolioId" = (
  SELECT p.id FROM "Portfolio" p
  INNER JOIN "Candidate" c ON c."userId" = p."userId"
  WHERE c.id = m."candidateId"
  LIMIT 1
);

-- Remove missions whose candidate has no portfolio
DELETE FROM "Mission" WHERE "portfolioId" IS NULL;

-- Make portfolioId required
ALTER TABLE "Mission" ALTER COLUMN "portfolioId" SET NOT NULL;

-- Drop old FK and column
ALTER TABLE "Mission" DROP CONSTRAINT "Mission_candidateId_fkey";
ALTER TABLE "Mission" DROP COLUMN "candidateId";

-- Add new FK
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

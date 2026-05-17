-- Replace PlanTier enum: BASIC/STANDARD/PRO/ENTERPRISE → LITE/GROWTH/BUSINESS

CREATE TYPE "PlanTier_new" AS ENUM ('LITE', 'GROWTH', 'BUSINESS');

ALTER TABLE "User" ALTER COLUMN "plan" DROP DEFAULT;

ALTER TABLE "User" ALTER COLUMN "plan" TYPE "PlanTier_new" USING (
  CASE "plan"::text
    WHEN 'BASIC' THEN 'LITE'::"PlanTier_new"
    WHEN 'STANDARD' THEN 'GROWTH'::"PlanTier_new"
    WHEN 'PRO' THEN 'BUSINESS'::"PlanTier_new"
    WHEN 'ENTERPRISE' THEN 'BUSINESS'::"PlanTier_new"
    ELSE 'LITE'::"PlanTier_new"
  END
);

DELETE FROM "Plan";

ALTER TABLE "Plan" ALTER COLUMN "tier" TYPE "PlanTier_new" USING ('LITE'::"PlanTier_new");

DROP TYPE "PlanTier";
ALTER TYPE "PlanTier_new" RENAME TO "PlanTier";

ALTER TABLE "User" ALTER COLUMN "plan" SET DEFAULT 'LITE';

-- No plan on signup; user picks a plan when subscribing

ALTER TABLE "User" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "plan" DROP NOT NULL;

-- Clear auto-assigned LITE for users who never paid for a plan
UPDATE "User" u
SET "plan" = NULL
WHERE u."plan" = 'LITE'
  AND NOT EXISTS (
    SELECT 1
    FROM "Payment" p
    WHERE p."userId" = u."id"
      AND p."status" = 'succeeded'
      AND p."productId" LIKE 'plan_%'
  );

-- AlterTable
ALTER TABLE "SalonProfile" ADD COLUMN "referenceName" TEXT;
ALTER TABLE "SalonProfile" ADD COLUMN "contactEmails" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "SalonProfile" ADD COLUMN "footerAddress" TEXT;
ALTER TABLE "SalonProfile" ADD COLUMN "footerPhone" TEXT;
ALTER TABLE "SalonProfile" ADD COLUMN "footerWebsite" TEXT;
ALTER TABLE "SalonProfile" ADD COLUMN "footerLegal" TEXT;

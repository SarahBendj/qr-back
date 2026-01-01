/*
  Warnings:

  - You are about to drop the column `tech` on the `Project` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Project" DROP COLUMN "tech",
ADD COLUMN     "tag" TEXT[];

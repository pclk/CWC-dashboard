-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TemplateType" ADD VALUE 'MORNING_LAB';
ALTER TYPE "TemplateType" ADD VALUE 'FIRST_PARADE';
ALTER TYPE "TemplateType" ADD VALUE 'PT';

-- AlterTable
ALTER TABLE "CadetRecord" ADD COLUMN     "unknownEndTime" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "announcementFirstParadeTime" TEXT,
ADD COLUMN     "announcementMorningLabIsPt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "announcementMorningLabTime" TEXT,
ADD COLUMN     "announcementPtActivity" TEXT,
ADD COLUMN     "announcementPtTime" TEXT;

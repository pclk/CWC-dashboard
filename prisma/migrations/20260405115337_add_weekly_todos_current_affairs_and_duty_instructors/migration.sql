-- CreateEnum
CREATE TYPE "CurrentAffairScope" AS ENUM ('LOCAL', 'OVERSEAS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TemplateType" ADD VALUE 'CURRENT_AFFAIR_SHARING';
ALTER TYPE "TemplateType" ADD VALUE 'CURRENT_AFFAIR_REMINDER';
ALTER TYPE "TemplateType" ADD VALUE 'REQUEST_DI_FP';
ALTER TYPE "TemplateType" ADD VALUE 'REQUEST_LP';

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "announcementRequestDiFirstTime" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "announcementRequestDiLocation" TEXT,
ADD COLUMN     "announcementRequestDiName" TEXT,
ADD COLUMN     "announcementRequestDiRank" TEXT,
ADD COLUMN     "announcementRequestDiRecipient" TEXT,
ADD COLUMN     "announcementRequestDiTime" TEXT,
ADD COLUMN     "announcementRequestLpLocation" TEXT,
ADD COLUMN     "announcementRequestLpRecipient" TEXT,
ADD COLUMN     "announcementRequestLpTime" TEXT;

-- CreateTable
CREATE TABLE "WeeklyTodo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "systemKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "completedWeekStart" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyTodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrentAffairSharing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sharingDate" TIMESTAMP(3) NOT NULL,
    "scope" "CurrentAffairScope" NOT NULL,
    "presenter" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurrentAffairSharing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DutyInstructor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dutyDate" TIMESTAMP(3) NOT NULL,
    "rank" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reserve" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DutyInstructor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyTodo_userId_sortOrder_idx" ON "WeeklyTodo"("userId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyTodo_userId_systemKey_key" ON "WeeklyTodo"("userId", "systemKey");

-- CreateIndex
CREATE INDEX "CurrentAffairSharing_userId_sharingDate_idx" ON "CurrentAffairSharing"("userId", "sharingDate");

-- CreateIndex
CREATE INDEX "DutyInstructor_userId_dutyDate_idx" ON "DutyInstructor"("userId", "dutyDate");

-- CreateIndex
CREATE UNIQUE INDEX "DutyInstructor_userId_dutyDate_key" ON "DutyInstructor"("userId", "dutyDate");

-- AddForeignKey
ALTER TABLE "WeeklyTodo" ADD CONSTRAINT "WeeklyTodo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurrentAffairSharing" ADD CONSTRAINT "CurrentAffairSharing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DutyInstructor" ADD CONSTRAINT "DutyInstructor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

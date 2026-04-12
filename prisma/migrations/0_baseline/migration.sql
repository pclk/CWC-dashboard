-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RecordCategory" AS ENUM ('MA_OA', 'MC', 'RSO', 'RSI', 'CL', 'HL', 'OTHER', 'STATUS_RESTRICTION');

-- CreateEnum
CREATE TYPE "ResolutionState" AS ENUM ('ACTIVE', 'EXPIRED_PENDING_CONFIRMATION', 'RESOLVED');

-- CreateEnum
CREATE TYPE "CurrentAffairScope" AS ENUM ('LOCAL', 'OVERSEAS', 'TBC');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('PARADE_MORNING', 'PARADE_NIGHT', 'TROOP_MOVEMENT', 'MTR_1030', 'MTR_1630', 'LAST_PARADE_1730', 'MORNING_LAB', 'FIRST_PARADE', 'PT', 'CURRENT_AFFAIR_SHARING', 'CURRENT_AFFAIR_REMINDER', 'REQUEST_DI_FP', 'REQUEST_LP', 'BOOK_IN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "unitName" TEXT NOT NULL DEFAULT '13/25 C4X',
    "defaultParadePrefix" TEXT,
    "defaultNightPrefix" TEXT,
    "defaultLastParadeText" TEXT,
    "defaultMtrMorningText" TEXT,
    "defaultMtrAfternoonText" TEXT,
    "announcementMtr1030Time" TEXT,
    "announcementMtr1030Location" TEXT,
    "announcementMtr1630Time" TEXT,
    "announcementMtr1630Location" TEXT,
    "announcementLastParadeTime" TEXT,
    "announcementLastParadeLocation" TEXT,
    "announcementMorningLabTime" TEXT,
    "announcementMorningLabIsPt" BOOLEAN NOT NULL DEFAULT false,
    "announcementFirstParadeTime" TEXT,
    "announcementPtTime" TEXT,
    "announcementPtActivity" TEXT,
    "announcementRequestDiRecipient" TEXT,
    "announcementRequestDiRank" TEXT,
    "announcementRequestDiName" TEXT,
    "announcementRequestDiLocation" TEXT,
    "announcementRequestDiTime" TEXT,
    "announcementRequestDiFirstTime" BOOLEAN NOT NULL DEFAULT false,
    "announcementRequestLpRecipient" TEXT,
    "announcementRequestLpLocation" TEXT,
    "announcementRequestLpTime" TEXT,
    "paradeDraftReportType" TEXT,
    "paradeDraftReportAtValue" TEXT,
    "paradeDraftReportTimeLabel" TEXT,
    "paradeDraftPrefixOverride" TEXT,
    "bunkDraftYesterdayLastBunkNumber" INTEGER,
    "bunkDraftHavePtToday" BOOLEAN NOT NULL DEFAULT false,
    "movementDraftFromLocation" TEXT,
    "movementDraftToLocation" TEXT,
    "movementDraftStrengthText" TEXT,
    "movementDraftArrivalTimeText" TEXT,
    "movementDraftRemarksText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cadet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" TEXT NOT NULL DEFAULT 'ME4T',
    "displayName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cadet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadetRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cadetId" TEXT NOT NULL,
    "category" "RecordCategory" NOT NULL,
    "title" TEXT,
    "details" TEXT,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "unknownEndTime" BOOLEAN NOT NULL DEFAULT false,
    "affectsStrength" BOOLEAN NOT NULL DEFAULT true,
    "countsNotInCamp" BOOLEAN NOT NULL DEFAULT false,
    "resolutionState" "ResolutionState" NOT NULL DEFAULT 'ACTIVE',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CadetRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cadetId" TEXT,
    "title" TEXT NOT NULL,
    "venue" TEXT,
    "appointmentAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "affectsMorningStrength" BOOLEAN NOT NULL DEFAULT false,
    "affectsAfternoonStrength" BOOLEAN NOT NULL DEFAULT false,
    "affectsEveningStrength" BOOLEAN NOT NULL DEFAULT false,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "Bunk" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bunkNumber" INTEGER NOT NULL,
    "bunkId" TEXT NOT NULL,
    "personnel" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParadeStateSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL,
    "totalStrength" INTEGER NOT NULL,
    "presentStrength" INTEGER NOT NULL,
    "finalMessage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParadeStateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TroopMovement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromLocation" TEXT NOT NULL,
    "toLocation" TEXT NOT NULL,
    "strengthText" TEXT NOT NULL,
    "arrivalTimeText" TEXT NOT NULL,
    "remarks" TEXT NOT NULL,
    "finalMessage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TroopMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TemplateType" NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE INDEX "Cadet_userId_active_idx" ON "Cadet"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Cadet_userId_displayName_key" ON "Cadet"("userId", "displayName");

-- CreateIndex
CREATE INDEX "CadetRecord_userId_category_resolutionState_idx" ON "CadetRecord"("userId", "category", "resolutionState");

-- CreateIndex
CREATE INDEX "CadetRecord_userId_cadetId_idx" ON "CadetRecord"("userId", "cadetId");

-- CreateIndex
CREATE INDEX "CadetRecord_userId_endAt_idx" ON "CadetRecord"("userId", "endAt");

-- CreateIndex
CREATE INDEX "Appointment_userId_appointmentAt_completed_idx" ON "Appointment"("userId", "appointmentAt", "completed");

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

-- CreateIndex
CREATE INDEX "Bunk_userId_bunkNumber_idx" ON "Bunk"("userId", "bunkNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Bunk_userId_bunkNumber_key" ON "Bunk"("userId", "bunkNumber");

-- CreateIndex
CREATE INDEX "ParadeStateSnapshot_userId_reportedAt_idx" ON "ParadeStateSnapshot"("userId", "reportedAt");

-- CreateIndex
CREATE INDEX "TroopMovement_userId_createdAt_idx" ON "TroopMovement"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MessageTemplate_userId_type_idx" ON "MessageTemplate"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_userId_type_name_key" ON "MessageTemplate"("userId", "type", "name");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cadet" ADD CONSTRAINT "Cadet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadetRecord" ADD CONSTRAINT "CadetRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadetRecord" ADD CONSTRAINT "CadetRecord_cadetId_fkey" FOREIGN KEY ("cadetId") REFERENCES "Cadet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_cadetId_fkey" FOREIGN KEY ("cadetId") REFERENCES "Cadet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyTodo" ADD CONSTRAINT "WeeklyTodo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurrentAffairSharing" ADD CONSTRAINT "CurrentAffairSharing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DutyInstructor" ADD CONSTRAINT "DutyInstructor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bunk" ADD CONSTRAINT "Bunk_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParadeStateSnapshot" ADD CONSTRAINT "ParadeStateSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TroopMovement" ADD CONSTRAINT "TroopMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


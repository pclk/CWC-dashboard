-- CreateEnum
CREATE TYPE "CetActivityType" AS ENUM ('LAB', 'PT', 'BUNK', 'COOKHOUSE', 'MEDICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "CetVisibility" AS ENUM ('COHORT', 'SELECTED_CADETS');

-- CreateEnum
CREATE TYPE "CetBlockSource" AS ENUM ('MANUAL', 'TEMPLATE', 'APPOINTMENT_IMPORT');

-- CreateEnum
CREATE TYPE "CetActorRole" AS ENUM ('CWC', 'INSTRUCTOR', 'SYSTEM');

-- CreateTable
CREATE TABLE "CetVenue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CetVenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CetAttire" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CetAttire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CetDaySchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CetDaySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CetDayBlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "activityType" "CetActivityType" NOT NULL,
    "venueId" TEXT,
    "attireId" TEXT,
    "requiredItems" TEXT,
    "remarks" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "visibility" "CetVisibility" NOT NULL DEFAULT 'COHORT',
    "source" "CetBlockSource" NOT NULL DEFAULT 'MANUAL',
    "sourceId" TEXT,
    "createdByRole" "CetActorRole" NOT NULL,
    "createdByName" TEXT NOT NULL,
    "updatedByRole" "CetActorRole",
    "updatedByName" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedByRole" "CetActorRole",
    "deletedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CetDayBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CetDayBlockTargetCadet" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "cadetId" TEXT NOT NULL,

    CONSTRAINT "CetDayBlockTargetCadet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CetDayBlockHistory" (
    "id" TEXT NOT NULL,
    "blockId" TEXT,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "actorRole" "CetActorRole" NOT NULL,
    "actorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CetDayBlockHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CetTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CetTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CetTemplateBlock" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "activityType" "CetActivityType" NOT NULL,
    "venueId" TEXT,
    "attireId" TEXT,
    "requiredItems" TEXT,
    "remarks" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "visibility" "CetVisibility" NOT NULL DEFAULT 'COHORT',

    CONSTRAINT "CetTemplateBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CetCadetViewState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cadetId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "lastViewedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CetCadetViewState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CetVenue_userId_active_idx" ON "CetVenue"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CetVenue_userId_name_key" ON "CetVenue"("userId", "name");

-- CreateIndex
CREATE INDEX "CetAttire_userId_active_idx" ON "CetAttire"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CetAttire_userId_name_key" ON "CetAttire"("userId", "name");

-- CreateIndex
CREATE INDEX "CetDaySchedule_userId_date_idx" ON "CetDaySchedule"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CetDaySchedule_userId_date_key" ON "CetDaySchedule"("userId", "date");

-- CreateIndex
CREATE INDEX "CetDayBlock_userId_startAt_idx" ON "CetDayBlock"("userId", "startAt");

-- CreateIndex
CREATE INDEX "CetDayBlock_scheduleId_deletedAt_idx" ON "CetDayBlock"("scheduleId", "deletedAt");

-- CreateIndex
CREATE INDEX "CetDayBlockTargetCadet_cadetId_idx" ON "CetDayBlockTargetCadet"("cadetId");

-- CreateIndex
CREATE UNIQUE INDEX "CetDayBlockTargetCadet_blockId_cadetId_key" ON "CetDayBlockTargetCadet"("blockId", "cadetId");

-- CreateIndex
CREATE INDEX "CetDayBlockHistory_userId_createdAt_idx" ON "CetDayBlockHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CetDayBlockHistory_blockId_createdAt_idx" ON "CetDayBlockHistory"("blockId", "createdAt");

-- CreateIndex
CREATE INDEX "CetTemplate_userId_active_idx" ON "CetTemplate"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CetTemplate_userId_name_key" ON "CetTemplate"("userId", "name");

-- CreateIndex
CREATE INDEX "CetTemplateBlock_templateId_idx" ON "CetTemplateBlock"("templateId");

-- CreateIndex
CREATE INDEX "CetCadetViewState_userId_date_idx" ON "CetCadetViewState"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CetCadetViewState_cadetId_date_key" ON "CetCadetViewState"("cadetId", "date");

-- AddForeignKey
ALTER TABLE "CetVenue" ADD CONSTRAINT "CetVenue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CetAttire" ADD CONSTRAINT "CetAttire_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CetDaySchedule" ADD CONSTRAINT "CetDaySchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CetDayBlock" ADD CONSTRAINT "CetDayBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CetDayBlock" ADD CONSTRAINT "CetDayBlock_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "CetDaySchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CetDayBlock" ADD CONSTRAINT "CetDayBlock_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "CetVenue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CetDayBlock" ADD CONSTRAINT "CetDayBlock_attireId_fkey" FOREIGN KEY ("attireId") REFERENCES "CetAttire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CetDayBlockTargetCadet" ADD CONSTRAINT "CetDayBlockTargetCadet_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "CetDayBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CetDayBlockTargetCadet" ADD CONSTRAINT "CetDayBlockTargetCadet_cadetId_fkey" FOREIGN KEY ("cadetId") REFERENCES "Cadet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CetDayBlockHistory" ADD CONSTRAINT "CetDayBlockHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CetDayBlockHistory" ADD CONSTRAINT "CetDayBlockHistory_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "CetDayBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CetTemplate" ADD CONSTRAINT "CetTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CetTemplateBlock" ADD CONSTRAINT "CetTemplateBlock_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CetTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CetTemplateBlock" ADD CONSTRAINT "CetTemplateBlock_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "CetVenue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CetTemplateBlock" ADD CONSTRAINT "CetTemplateBlock_attireId_fkey" FOREIGN KEY ("attireId") REFERENCES "CetAttire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CetCadetViewState" ADD CONSTRAINT "CetCadetViewState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CetCadetViewState" ADD CONSTRAINT "CetCadetViewState_cadetId_fkey" FOREIGN KEY ("cadetId") REFERENCES "Cadet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "CadetRequestType" AS ENUM ('REPORT_SICK', 'MC_STATUS_UPDATE');

-- CreateEnum
CREATE TYPE "CadetRequestStatus" AS ENUM ('PENDING_INSTRUCTOR', 'PENDING_CWC', 'APPROVED', 'DECLINED');

-- CreateTable
CREATE TABLE "CadetRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cadetId" TEXT NOT NULL,
    "type" "CadetRequestType" NOT NULL,
    "category" "RecordCategory" NOT NULL,
    "title" TEXT,
    "details" TEXT,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "unknownEndTime" BOOLEAN NOT NULL DEFAULT false,
    "affectsStrength" BOOLEAN NOT NULL DEFAULT true,
    "countsNotInCamp" BOOLEAN NOT NULL DEFAULT false,
    "status" "CadetRequestStatus" NOT NULL,
    "instructorApprovedAt" TIMESTAMP(3),
    "instructorApprovedBy" TEXT,
    "cwcApprovedAt" TIMESTAMP(3),
    "cwcApprovedBy" TEXT,
    "declinedAt" TIMESTAMP(3),
    "declinedByRole" TEXT,
    "declineReason" TEXT,
    "resultingCadetRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CadetRequest_userId_status_idx" ON "CadetRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "CadetRequest_cadetId_status_idx" ON "CadetRequest"("cadetId", "status");

-- CreateIndex
CREATE INDEX "CadetRequest_userId_type_status_idx" ON "CadetRequest"("userId", "type", "status");

-- AddForeignKey
ALTER TABLE "CadetRequest" ADD CONSTRAINT "CadetRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadetRequest" ADD CONSTRAINT "CadetRequest_cadetId_fkey" FOREIGN KEY ("cadetId") REFERENCES "Cadet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadetRequest" ADD CONSTRAINT "CadetRequest_resultingCadetRecordId_fkey" FOREIGN KEY ("resultingCadetRecordId") REFERENCES "CadetRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

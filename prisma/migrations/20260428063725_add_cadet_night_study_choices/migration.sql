-- CreateEnum
CREATE TYPE "CadetNightStudyChoiceType" AS ENUM ('NIGHT_STUDY', 'EARLY_PARTY', 'GO_BACK_BUNK');

-- CreateTable
CREATE TABLE "CadetNightStudyChoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cadetId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "choice" "CadetNightStudyChoiceType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadetNightStudyChoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CadetNightStudyChoice_userId_date_idx" ON "CadetNightStudyChoice"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CadetNightStudyChoice_cadetId_date_key" ON "CadetNightStudyChoice"("cadetId", "date");

-- AddForeignKey
ALTER TABLE "CadetNightStudyChoice" ADD CONSTRAINT "CadetNightStudyChoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadetNightStudyChoice" ADD CONSTRAINT "CadetNightStudyChoice_cadetId_fkey" FOREIGN KEY ("cadetId") REFERENCES "Cadet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

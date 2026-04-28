-- AlterTable
ALTER TABLE "Cadet" ADD COLUMN     "appointmentHolder" TEXT,
ADD COLUMN     "lastPasswordSetAt" TIMESTAMP(3),
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "resetTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "resetTokenHash" TEXT,
ADD COLUMN     "resetTokenRevokedAt" TIMESTAMP(3),
ADD COLUMN     "resetTokenRevokedReason" TEXT;

-- CreateIndex
CREATE INDEX "Cadet_userId_appointmentHolder_active_idx" ON "Cadet"("userId", "appointmentHolder", "active");

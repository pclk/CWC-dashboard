-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "browser" TEXT NOT NULL DEFAULT 'Unknown browser',
    "os" TEXT NOT NULL DEFAULT 'Unknown OS',
    "deviceType" TEXT NOT NULL DEFAULT 'unknown',
    "deviceLabel" TEXT NOT NULL DEFAULT 'Unknown device',
    "signedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserSession_userId_revokedAt_idx" ON "UserSession"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "UserSession_userId_lastSeenAt_idx" ON "UserSession"("userId", "lastSeenAt");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

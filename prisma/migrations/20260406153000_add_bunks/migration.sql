CREATE TABLE "Bunk" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bunkNumber" INTEGER NOT NULL,
    "bunkId" TEXT NOT NULL,
    "personnel" TEXT[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bunk_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Bunk_userId_bunkNumber_key" ON "Bunk"("userId", "bunkNumber");

CREATE INDEX "Bunk_userId_bunkNumber_idx" ON "Bunk"("userId", "bunkNumber");

ALTER TABLE "Bunk" ADD CONSTRAINT "Bunk_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

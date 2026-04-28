CREATE TABLE "CadetRecordStat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cadetId" TEXT NOT NULL,
    "category" "RecordCategory" NOT NULL,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "firstRecordAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadetRecordStat_pkey" PRIMARY KEY ("id")
);

INSERT INTO "CadetRecordStat" (
    "id",
    "userId",
    "cadetId",
    "category",
    "recordCount",
    "firstRecordAt",
    "updatedAt"
)
SELECT
    'crs_' || md5("userId" || ':' || "cadetId" || ':' || "category"::text),
    "userId",
    "cadetId",
    "category",
    COUNT(*)::integer,
    MIN(COALESCE("startAt", "createdAt")),
    CURRENT_TIMESTAMP
FROM "CadetRecord"
GROUP BY "userId", "cadetId", "category";

CREATE UNIQUE INDEX "CadetRecordStat_userId_cadetId_category_key" ON "CadetRecordStat"("userId", "cadetId", "category");
CREATE INDEX "CadetRecordStat_userId_cadetId_idx" ON "CadetRecordStat"("userId", "cadetId");
CREATE INDEX "CadetRecordStat_userId_category_idx" ON "CadetRecordStat"("userId", "category");

ALTER TABLE "CadetRecordStat" ADD CONSTRAINT "CadetRecordStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CadetRecordStat" ADD CONSTRAINT "CadetRecordStat_cadetId_fkey" FOREIGN KEY ("cadetId") REFERENCES "Cadet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

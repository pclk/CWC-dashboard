ALTER TABLE "CadetRecordStat" ADD COLUMN "totalDays" INTEGER NOT NULL DEFAULT 0;

UPDATE "CadetRecordStat" stat
SET "totalDays" = source."totalDays"
FROM (
    SELECT
        "userId",
        "cadetId",
        "category",
        SUM(
            CASE
                WHEN "startAt" IS NOT NULL AND "endAt" IS NOT NULL THEN
                    GREATEST(("endAt"::date - "startAt"::date) + 1, 1)
                WHEN "startAt" IS NOT NULL OR "endAt" IS NOT NULL THEN 1
                ELSE 0
            END
        )::integer AS "totalDays"
    FROM "CadetRecord"
    GROUP BY "userId", "cadetId", "category"
) source
WHERE stat."userId" = source."userId"
  AND stat."cadetId" = source."cadetId"
  AND stat."category" = source."category";

ALTER TABLE "Appointment"
ADD COLUMN "affectsMorningStrength" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "affectsAfternoonStrength" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "affectsEveningStrength" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Appointment"
SET
  "affectsMorningStrength" = EXTRACT(HOUR FROM ("appointmentAt" AT TIME ZONE 'Asia/Singapore')) < 12,
  "affectsAfternoonStrength" = EXTRACT(HOUR FROM ("appointmentAt" AT TIME ZONE 'Asia/Singapore')) >= 12
    AND EXTRACT(HOUR FROM ("appointmentAt" AT TIME ZONE 'Asia/Singapore')) < 17,
  "affectsEveningStrength" = EXTRACT(HOUR FROM ("appointmentAt" AT TIME ZONE 'Asia/Singapore')) >= 17;

INSERT INTO "Appointment" (
  "id",
  "userId",
  "cadetId",
  "title",
  "venue",
  "appointmentAt",
  "notes",
  "affectsMorningStrength",
  "affectsAfternoonStrength",
  "affectsEveningStrength",
  "completed",
  "createdAt",
  "updatedAt"
)
SELECT
  'maoa-' || "id",
  "userId",
  "cadetId",
  COALESCE(NULLIF("title", ''), NULLIF("details", ''), 'Appointment'),
  NULL,
  COALESCE("startAt", "endAt", "createdAt"),
  CASE
    WHEN NULLIF("title", '') IS NOT NULL AND NULLIF("details", '') IS NOT NULL THEN "details"
    ELSE NULL
  END,
  true,
  true,
  true,
  CASE
    WHEN "resolutionState" <> 'ACTIVE' OR COALESCE("endAt", "startAt", "createdAt") < CURRENT_TIMESTAMP
      THEN true
    ELSE false
  END,
  "createdAt",
  "updatedAt"
FROM "CadetRecord"
WHERE "category" = 'MA_OA';

DELETE FROM "CadetRecord"
WHERE "category" = 'MA_OA';

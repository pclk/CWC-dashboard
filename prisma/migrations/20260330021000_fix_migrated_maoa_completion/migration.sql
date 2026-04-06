UPDATE "Appointment"
SET "completed" = false
WHERE "id" LIKE 'maoa-%'
  AND "completed" = true
  AND "appointmentAt" >= (
    date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore'
  );

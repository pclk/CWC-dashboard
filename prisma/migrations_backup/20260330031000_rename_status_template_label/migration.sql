UPDATE "MessageTemplate"
SET "body" = REPLACE("body", 'Status Restrictions:', 'Status:')
WHERE "type" IN ('PARADE_MORNING', 'PARADE_NIGHT')
  AND "body" LIKE '%Status Restrictions:%';

ALTER TABLE "User" ADD COLUMN "instructorPasswordHash" TEXT;

UPDATE "User"
SET "instructorPasswordHash" = "passwordHash"
WHERE "instructorPasswordHash" IS NULL;

ALTER TABLE "User" ALTER COLUMN "instructorPasswordHash" SET NOT NULL;

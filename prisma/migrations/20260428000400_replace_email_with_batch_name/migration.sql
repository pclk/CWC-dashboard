ALTER TABLE "User" ADD COLUMN "batchName" TEXT;

UPDATE "User"
SET "batchName" = COALESCE(NULLIF(trim("displayName"), ''), NULLIF(split_part("email", '@', 1), ''), 'Batch');

ALTER TABLE "User" ALTER COLUMN "batchName" SET NOT NULL;

CREATE UNIQUE INDEX "User_batchName_key" ON "User"("batchName");

DROP INDEX IF EXISTS "User_email_key";

ALTER TABLE "User" DROP COLUMN "email";

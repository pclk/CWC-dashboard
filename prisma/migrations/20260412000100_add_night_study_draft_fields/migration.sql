ALTER TABLE "UserSettings"
ADD COLUMN "nightStudyDraftMode" TEXT NOT NULL DEFAULT 'NIGHT_STUDY',
ADD COLUMN "nightStudyPrimaryNamesText" TEXT,
ADD COLUMN "nightStudyEarlyPartyNamesText" TEXT;

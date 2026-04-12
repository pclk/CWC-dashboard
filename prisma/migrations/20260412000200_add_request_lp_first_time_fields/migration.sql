ALTER TABLE "UserSettings"
ADD COLUMN "announcementRequestLpRank" TEXT,
ADD COLUMN "announcementRequestLpName" TEXT,
ADD COLUMN "announcementRequestLpFirstTime" BOOLEAN NOT NULL DEFAULT false;

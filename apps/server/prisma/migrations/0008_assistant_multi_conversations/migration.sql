PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

DROP INDEX IF EXISTS "AssistantConversation_userProfileId_key";

ALTER TABLE "AssistantConversation" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "AssistantConversation" ADD COLUMN "lastMessageAt" DATETIME;

CREATE INDEX "AssistantConversation_userProfileId_lastMessageAt_idx" ON "AssistantConversation"("userProfileId", "lastMessageAt");

COMMIT;
PRAGMA foreign_keys=ON;

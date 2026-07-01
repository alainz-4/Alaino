PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

ALTER TABLE "AssistantConversation" ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS "AssistantConversation_userProfileId_lastMessageAt_idx";
CREATE INDEX "AssistantConversation_userProfileId_isPinned_lastMessageAt_idx" ON "AssistantConversation"("userProfileId", "isPinned", "lastMessageAt");

COMMIT;
PRAGMA foreign_keys=ON;

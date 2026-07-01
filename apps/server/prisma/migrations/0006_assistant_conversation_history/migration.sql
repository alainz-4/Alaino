PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

CREATE TABLE "AssistantConversation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userProfileId" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'Accounting assistant',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "AssistantConversation_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AssistantConversation_userProfileId_key" ON "AssistantConversation"("userProfileId");

CREATE TABLE "AssistantMessage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "assistantConversationId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "actionPlanJson" TEXT,
  "usedAi" BOOLEAN NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssistantMessage_assistantConversationId_fkey" FOREIGN KEY ("assistantConversationId") REFERENCES "AssistantConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AssistantMessage_assistantConversationId_createdAt_idx" ON "AssistantMessage"("assistantConversationId", "createdAt");

COMMIT;
PRAGMA foreign_keys=ON;

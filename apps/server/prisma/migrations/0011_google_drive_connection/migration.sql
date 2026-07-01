PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

CREATE TABLE "GoogleDriveConnection" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userProfileId" TEXT NOT NULL,
  "clientId" TEXT,
  "clientSecret" TEXT,
  "folderId" TEXT,
  "refreshToken" TEXT,
  "connectedEmail" TEXT,
  "connectedAt" DATETIME,
  "oauthState" TEXT,
  "oauthStateExpiresAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "GoogleDriveConnection_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "GoogleDriveConnection_userProfileId_key" ON "GoogleDriveConnection"("userProfileId");

COMMIT;
PRAGMA foreign_keys=ON;

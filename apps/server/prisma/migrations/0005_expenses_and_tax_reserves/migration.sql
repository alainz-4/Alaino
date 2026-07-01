PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

ALTER TABLE "FinanceSettings" ADD COLUMN "urssafReservePercent" TEXT NOT NULL DEFAULT '25.6';
ALTER TABLE "FinanceSettings" ADD COLUMN "incomeTaxReservePercent" TEXT NOT NULL DEFAULT '2.2';

CREATE TABLE "Expense" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userProfileId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "amount" TEXT NOT NULL,
  "dueDate" DATETIME NOT NULL,
  "recurrence" TEXT NOT NULL DEFAULT 'ONE_TIME',
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Expense_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Expense_userProfileId_dueDate_idx" ON "Expense"("userProfileId", "dueDate");
CREATE INDEX "Expense_userProfileId_status_idx" ON "Expense"("userProfileId", "status");

COMMIT;
PRAGMA foreign_keys=ON;

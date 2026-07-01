PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

CREATE TABLE "PaymentLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userProfileId" TEXT NOT NULL,
  "invoiceId" TEXT,
  "clientId" TEXT,
  "kind" TEXT NOT NULL DEFAULT 'INVOICE_PAYMENT',
  "title" TEXT NOT NULL,
  "amount" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "receivedAt" DATETIME NOT NULL,
  "method" TEXT,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PaymentLog_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PaymentLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "PaymentLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "PaymentLog_userProfileId_receivedAt_idx" ON "PaymentLog"("userProfileId", "receivedAt");
CREATE INDEX "PaymentLog_invoiceId_idx" ON "PaymentLog"("invoiceId");
CREATE INDEX "PaymentLog_clientId_idx" ON "PaymentLog"("clientId");

COMMIT;
PRAGMA foreign_keys=ON;
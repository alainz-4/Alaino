PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

CREATE TABLE "UserProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "fullName" TEXT NOT NULL,
  "legalStatus" TEXT NOT NULL,
  "siren" TEXT,
  "siret" TEXT,
  "addressLine1" TEXT NOT NULL,
  "addressLine2" TEXT,
  "postalCode" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "country" TEXT NOT NULL DEFAULT 'France',
  "email" TEXT,
  "phone" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "FreelanceSettings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userProfileId" TEXT NOT NULL,
  "defaultDailyRate" TEXT NOT NULL DEFAULT '0',
  "standardWorkingDays" INTEGER NOT NULL DEFAULT 20,
  "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
  "defaultCurrency" TEXT NOT NULL DEFAULT 'EUR',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "FreelanceSettings_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "FreelanceSettings_userProfileId_key" ON "FreelanceSettings"("userProfileId");

CREATE TABLE "FinanceSettings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userProfileId" TEXT NOT NULL,
  "monthlyEssentialExpenses" TEXT NOT NULL DEFAULT '0',
  "monthlyWants" TEXT NOT NULL DEFAULT '0',
  "emergencyFundMonths" INTEGER NOT NULL DEFAULT 6,
  "currentReserves" TEXT NOT NULL DEFAULT '0',
  "savingsGoalMonthly" TEXT NOT NULL DEFAULT '0',
  "needsPercent" TEXT NOT NULL DEFAULT '50',
  "wantsPercent" TEXT NOT NULL DEFAULT '30',
  "savingsPercent" TEXT NOT NULL DEFAULT '20',
  "monthlyLifestyleTarget" TEXT NOT NULL DEFAULT '0',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "FinanceSettings_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "FinanceSettings_userProfileId_key" ON "FinanceSettings"("userProfileId");

CREATE TABLE "InvoiceSettings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userProfileId" TEXT NOT NULL,
  "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
  "lastInvoiceSequence" INTEGER NOT NULL DEFAULT 0,
  "defaultCurrency" TEXT NOT NULL DEFAULT 'EUR',
  "defaultPaymentTermsDays" INTEGER NOT NULL DEFAULT 30,
  "latePaymentRate" TEXT NOT NULL DEFAULT '12',
  "recoveryChargeAmount" TEXT NOT NULL DEFAULT '40',
  "vatMode" TEXT NOT NULL DEFAULT 'EXEMPT',
  "vatRate" TEXT NOT NULL DEFAULT '20',
  "vatExemptionMention" TEXT NOT NULL DEFAULT 'TVA non applicable, art. 293 B du CGI',
  "logoUrl" TEXT,
  "primaryColor" TEXT NOT NULL DEFAULT '#17324d',
  "secondaryColor" TEXT NOT NULL DEFAULT '#eaf0f6',
  "bankDetails" TEXT,
  "termsAndConditions" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "InvoiceSettings_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "InvoiceSettings_userProfileId_key" ON "InvoiceSettings"("userProfileId");

CREATE TABLE "Client" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userProfileId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "legalName" TEXT,
  "addressLine1" TEXT NOT NULL,
  "addressLine2" TEXT,
  "postalCode" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "country" TEXT NOT NULL DEFAULT 'France',
  "vatNumber" TEXT,
  "email" TEXT,
  "contactName" TEXT,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Client_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Contract" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userProfileId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "paymentType" TEXT NOT NULL DEFAULT 'DAILY',
  "startDate" DATETIME NOT NULL,
  "endDate" DATETIME,
  "dailyRate" TEXT,
  "monthlyRetainerAmount" TEXT,
  "fixedProjectAmount" TEXT,
  "fixedProjectDate" DATETIME,
  "billingDayOfMonth" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT 1,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Contract_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "WorkDay" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userProfileId" TEXT NOT NULL,
  "clientId" TEXT,
  "contractId" TEXT,
  "invoiceId" TEXT,
  "workDate" DATETIME NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'WORKING',
  "dailyRate" TEXT,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "WorkDay_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WorkDay_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "WorkDay_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "WorkDay_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WorkDay_userProfileId_workDate_key" ON "WorkDay"("userProfileId", "workDate");

CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userProfileId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "contractId" TEXT,
  "invoiceSeries" TEXT NOT NULL DEFAULT 'INV',
  "invoiceNumber" TEXT NOT NULL,
  "sequenceNumber" INTEGER NOT NULL,
  "issueDate" DATETIME NOT NULL,
  "servicePeriodStart" DATETIME NOT NULL,
  "servicePeriodEnd" DATETIME NOT NULL,
  "subtotal" TEXT NOT NULL DEFAULT '0',
  "vatMode" TEXT NOT NULL DEFAULT 'EXEMPT',
  "vatRate" TEXT NOT NULL DEFAULT '0',
  "vatAmount" TEXT NOT NULL DEFAULT '0',
  "total" TEXT NOT NULL DEFAULT '0',
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "paymentTermsDays" INTEGER NOT NULL,
  "latePaymentRate" TEXT NOT NULL,
  "recoveryChargeAmount" TEXT NOT NULL,
  "vatExemptionMention" TEXT,
  "issuerName" TEXT NOT NULL,
  "issuerLegalStatus" TEXT NOT NULL,
  "issuerSiren" TEXT,
  "issuerSiret" TEXT,
  "issuerAddressLine1" TEXT NOT NULL,
  "issuerAddressLine2" TEXT,
  "issuerPostalCode" TEXT NOT NULL,
  "issuerCity" TEXT NOT NULL,
  "issuerCountry" TEXT NOT NULL,
  "clientName" TEXT NOT NULL,
  "clientLegalName" TEXT,
  "clientAddressLine1" TEXT NOT NULL,
  "clientAddressLine2" TEXT,
  "clientPostalCode" TEXT NOT NULL,
  "clientCity" TEXT NOT NULL,
  "clientCountry" TEXT NOT NULL,
  "clientVatNumber" TEXT,
  "notes" TEXT,
  "paidAt" DATETIME,
  "dueDate" DATETIME,
  "pdfPath" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Invoice_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Invoice_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE UNIQUE INDEX "Invoice_invoiceSeries_sequenceNumber_key" ON "Invoice"("invoiceSeries", "sequenceNumber");

CREATE TABLE "InvoiceLine" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "invoiceId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantityDays" TEXT NOT NULL,
  "unitPrice" TEXT NOT NULL,
  "total" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");
CREATE INDEX "WorkDay_contractId_idx" ON "WorkDay"("contractId");
CREATE INDEX "WorkDay_clientId_idx" ON "WorkDay"("clientId");
CREATE INDEX "WorkDay_invoiceId_idx" ON "WorkDay"("invoiceId");
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");
CREATE INDEX "Invoice_contractId_idx" ON "Invoice"("contractId");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

COMMIT;
PRAGMA foreign_keys=ON;

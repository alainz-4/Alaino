-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "profilePreset" TEXT NOT NULL DEFAULT 'FRENCH_FREELANCER',
    "fullName" TEXT NOT NULL,
    "legalStatus" TEXT NOT NULL,
    "siren" TEXT,
    "siret" TEXT,
    "commercialRegisterNumber" TEXT,
    "taxId" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'France',
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreelanceSettings" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "defaultDailyRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "standardWorkingDays" INTEGER NOT NULL DEFAULT 20,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "defaultCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreelanceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceSettings" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "monthlyEssentialExpenses" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "monthlyWants" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "emergencyFundMonths" INTEGER NOT NULL DEFAULT 6,
    "currentReserves" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "savingsGoalMonthly" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "needsPercent" DECIMAL(65,30) NOT NULL DEFAULT 50,
    "wantsPercent" DECIMAL(65,30) NOT NULL DEFAULT 30,
    "savingsPercent" DECIMAL(65,30) NOT NULL DEFAULT 20,
    "monthlyLifestyleTarget" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "urssafReservePercent" DECIMAL(65,30) NOT NULL DEFAULT 25.6,
    "incomeTaxReservePercent" DECIMAL(65,30) NOT NULL DEFAULT 2.2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceSettings" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "lastInvoiceSequence" INTEGER NOT NULL DEFAULT 0,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "defaultPaymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "latePaymentRate" DECIMAL(65,30) NOT NULL DEFAULT 12,
    "recoveryChargeAmount" DECIMAL(65,30) NOT NULL DEFAULT 40,
    "vatMode" TEXT NOT NULL DEFAULT 'EXEMPT',
    "vatRate" DECIMAL(65,30) NOT NULL DEFAULT 20,
    "vatExemptionMention" TEXT NOT NULL DEFAULT 'TVA non applicable, art. 293 B du CGI',
    "logoUrl" TEXT,
    "signatureUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#17324d',
    "secondaryColor" TEXT NOT NULL DEFAULT '#eaf0f6',
    "bankDetails" TEXT,
    "termsAndConditions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleDriveConnection" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "clientId" TEXT,
    "clientSecret" TEXT,
    "folderId" TEXT,
    "refreshToken" TEXT,
    "connectedEmail" TEXT,
    "connectedAt" TIMESTAMP(3),
    "oauthState" TEXT,
    "oauthStateExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleDriveConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL DEFAULT 'DAILY',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "dailyRate" DECIMAL(65,30),
    "monthlyRetainerAmount" DECIMAL(65,30),
    "fixedProjectAmount" DECIMAL(65,30),
    "fixedProjectDate" TIMESTAMP(3),
    "billingDayOfMonth" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkDay" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "clientId" TEXT,
    "contractId" TEXT,
    "invoiceId" TEXT,
    "workDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WORKING',
    "dailyRate" DECIMAL(65,30),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "recurrence" TEXT NOT NULL DEFAULT 'ONE_TIME',
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantConversation" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Accounting assistant',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "memorySummary" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantMessage" (
    "id" TEXT NOT NULL,
    "assistantConversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "actionPlanJson" TEXT,
    "usedAi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contractId" TEXT,
    "invoiceSeries" TEXT NOT NULL DEFAULT 'INV',
    "invoiceNumber" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "servicePeriodStart" TIMESTAMP(3) NOT NULL,
    "servicePeriodEnd" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "vatMode" TEXT NOT NULL DEFAULT 'EXEMPT',
    "vatRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "vatAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "paymentTermsDays" INTEGER NOT NULL,
    "latePaymentRate" DECIMAL(65,30) NOT NULL,
    "recoveryChargeAmount" DECIMAL(65,30) NOT NULL,
    "vatExemptionMention" TEXT,
    "issuerName" TEXT NOT NULL,
    "issuerLegalStatus" TEXT NOT NULL,
    "issuerSiren" TEXT,
    "issuerSiret" TEXT,
    "issuerCommercialRegisterNumber" TEXT,
    "issuerTaxId" TEXT,
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
    "paidAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "pdfPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentLog" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "clientId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'INVOICE_PAYMENT',
    "title" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "method" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantityDays" DECIMAL(65,30) NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FreelanceSettings_userProfileId_key" ON "FreelanceSettings"("userProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceSettings_userProfileId_key" ON "FinanceSettings"("userProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceSettings_userProfileId_key" ON "InvoiceSettings"("userProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleDriveConnection_userProfileId_key" ON "GoogleDriveConnection"("userProfileId");

-- CreateIndex
CREATE INDEX "WorkDay_contractId_idx" ON "WorkDay"("contractId");

-- CreateIndex
CREATE INDEX "WorkDay_clientId_idx" ON "WorkDay"("clientId");

-- CreateIndex
CREATE INDEX "WorkDay_invoiceId_idx" ON "WorkDay"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkDay_userProfileId_workDate_key" ON "WorkDay"("userProfileId", "workDate");

-- CreateIndex
CREATE INDEX "Expense_userProfileId_dueDate_idx" ON "Expense"("userProfileId", "dueDate");

-- CreateIndex
CREATE INDEX "Expense_userProfileId_status_idx" ON "Expense"("userProfileId", "status");

-- CreateIndex
CREATE INDEX "AssistantConversation_userProfileId_isPinned_lastMessageAt_idx" ON "AssistantConversation"("userProfileId", "isPinned", "lastMessageAt");

-- CreateIndex
CREATE INDEX "AssistantMessage_assistantConversationId_createdAt_idx" ON "AssistantMessage"("assistantConversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");

-- CreateIndex
CREATE INDEX "Invoice_contractId_idx" ON "Invoice"("contractId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceSeries_sequenceNumber_key" ON "Invoice"("invoiceSeries", "sequenceNumber");

-- CreateIndex
CREATE INDEX "PaymentLog_userProfileId_receivedAt_idx" ON "PaymentLog"("userProfileId", "receivedAt");

-- CreateIndex
CREATE INDEX "PaymentLog_invoiceId_idx" ON "PaymentLog"("invoiceId");

-- CreateIndex
CREATE INDEX "PaymentLog_clientId_idx" ON "PaymentLog"("clientId");

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

-- AddForeignKey
ALTER TABLE "FreelanceSettings" ADD CONSTRAINT "FreelanceSettings_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceSettings" ADD CONSTRAINT "FinanceSettings_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceSettings" ADD CONSTRAINT "InvoiceSettings_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleDriveConnection" ADD CONSTRAINT "GoogleDriveConnection_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkDay" ADD CONSTRAINT "WorkDay_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkDay" ADD CONSTRAINT "WorkDay_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkDay" ADD CONSTRAINT "WorkDay_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkDay" ADD CONSTRAINT "WorkDay_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantConversation" ADD CONSTRAINT "AssistantConversation_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantMessage" ADD CONSTRAINT "AssistantMessage_assistantConversationId_fkey" FOREIGN KEY ("assistantConversationId") REFERENCES "AssistantConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLog" ADD CONSTRAINT "PaymentLog_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLog" ADD CONSTRAINT "PaymentLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLog" ADD CONSTRAINT "PaymentLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

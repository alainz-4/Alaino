ALTER TABLE "UserProfile" ADD COLUMN "commercialRegisterNumber" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "taxId" TEXT;

ALTER TABLE "Invoice" ADD COLUMN "issuerCommercialRegisterNumber" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "issuerTaxId" TEXT;

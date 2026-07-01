import type { Client, Invoice, InvoiceLine, InvoiceSettings, UserProfile } from "@prisma/client";
import { calculateInvoiceTotals } from "@freelance/shared";
import { buildInvoicePdfBuffer } from "./pdf.js";
import { toDecimal, toNumber } from "./number.js";

type PreviewProfileInput = {
  profilePreset: string;
  fullName: string;
  legalStatus: string;
  siren?: string | null;
  siret?: string | null;
  commercialRegisterNumber?: string | null;
  taxId?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  postalCode: string;
  city: string;
  country: string;
  email?: string | null;
  phone?: string | null;
};

type PreviewInvoiceSettingsInput = {
  invoicePrefix: string;
  defaultCurrency: string;
  defaultPaymentTermsDays: number;
  latePaymentRate: number;
  recoveryChargeAmount: number;
  vatMode: "APPLICABLE" | "EXEMPT";
  vatRate: number;
  vatExemptionMention: string;
  logoUrl?: string | null;
  signatureUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  bankDetails?: string | null;
  termsAndConditions?: string | null;
};

type PreviewInvoice = Invoice & {
  lines: InvoiceLine[];
  client: Client;
  userProfile: UserProfile;
  contract?: null;
  workDays?: [];
};

export async function buildInvoiceSettingsPreviewPdfBuffer(params: {
  profile: PreviewProfileInput;
  invoiceSettings: PreviewInvoiceSettingsInput;
}): Promise<Buffer> {
  const now = new Date();
  const issueDate = now;
  const servicePeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const servicePeriodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const sampleClient: Client = {
    id: "preview-client",
    userProfileId: "preview-profile",
    name: "Sample client Ltd",
    legalName: "Sample client Ltd",
    addressLine1: "221B Baker Street",
    addressLine2: null,
    postalCode: "NW1 6XE",
    city: "London",
    country: "United Kingdom",
    vatNumber: "GB123456789",
    email: "accounts@sampleclient.co.uk",
    contactName: "Accounts team",
    notes: null,
    createdAt: now,
    updatedAt: now
  };

  const sampleLines: InvoiceLine[] = [
    {
      id: "preview-line-1",
      invoiceId: "preview-invoice",
      description: "Strategy, delivery, and coordination preview",
      quantityDays: toDecimal(2),
      unitPrice: toDecimal(850),
      total: toDecimal(1700),
      sortOrder: 0,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "preview-line-2",
      invoiceId: "preview-invoice",
      description: "Client follow-up and handoff",
      quantityDays: toDecimal(1),
      unitPrice: toDecimal(450),
      total: toDecimal(450),
      sortOrder: 1,
      createdAt: now,
      updatedAt: now
    }
  ];

  const totals = calculateInvoiceTotals({
    lines: sampleLines.map((line) => ({
      quantityDays: toNumber(line.quantityDays),
      unitPrice: toNumber(line.unitPrice)
    })),
    vatRate: toNumber(params.invoiceSettings.vatRate),
    vatApplicable: params.invoiceSettings.vatMode === "APPLICABLE"
  });

  const previewInvoice: PreviewInvoice = {
    id: "preview-invoice",
    userProfileId: "preview-profile",
    clientId: sampleClient.id,
    contractId: null,
    userProfile: params.profile as UserProfile,
    client: sampleClient,
    contract: null,
    invoiceSeries: params.invoiceSettings.invoicePrefix,
    invoiceNumber: `${params.invoiceSettings.invoicePrefix}-PREVIEW`,
    sequenceNumber: 0,
    issueDate,
    servicePeriodStart,
    servicePeriodEnd,
    subtotal: toDecimal(totals.subtotal),
    vatMode: params.invoiceSettings.vatMode,
    vatRate: toDecimal(params.invoiceSettings.vatMode === "APPLICABLE" ? toNumber(params.invoiceSettings.vatRate) : 0),
    vatAmount: toDecimal(totals.vatAmount),
    total: toDecimal(totals.total),
    currency: params.invoiceSettings.defaultCurrency,
    status: "DRAFT",
    paymentTermsDays: params.invoiceSettings.defaultPaymentTermsDays,
    latePaymentRate: toDecimal(params.invoiceSettings.latePaymentRate),
    recoveryChargeAmount: toDecimal(params.invoiceSettings.recoveryChargeAmount),
    vatExemptionMention:
      params.invoiceSettings.vatMode === "EXEMPT" ? params.invoiceSettings.vatExemptionMention : null,
    issuerName: params.profile.fullName,
    issuerLegalStatus: params.profile.legalStatus,
    issuerSiren: params.profile.profilePreset === "FRENCH_FREELANCER" ? params.profile.siren ?? null : null,
    issuerSiret: params.profile.profilePreset === "FRENCH_FREELANCER" ? params.profile.siret ?? null : null,
    issuerCommercialRegisterNumber:
      params.profile.profilePreset === "LEBANESE_COMPANY" ? params.profile.commercialRegisterNumber ?? null : null,
    issuerTaxId: params.profile.profilePreset === "LEBANESE_COMPANY" ? params.profile.taxId ?? null : null,
    issuerAddressLine1: params.profile.addressLine1,
    issuerAddressLine2: params.profile.addressLine2 ?? null,
    issuerPostalCode: params.profile.postalCode,
    issuerCity: params.profile.city,
    issuerCountry: params.profile.country,
    clientName: sampleClient.name,
    clientLegalName: sampleClient.legalName ?? null,
    clientAddressLine1: sampleClient.addressLine1,
    clientAddressLine2: sampleClient.addressLine2,
    clientPostalCode: sampleClient.postalCode,
    clientCity: sampleClient.city,
    clientCountry: sampleClient.country,
    clientVatNumber: sampleClient.vatNumber,
    notes: "Preview generated from the current invoice settings.",
    paidAt: null,
    dueDate: addDays(issueDate, params.invoiceSettings.defaultPaymentTermsDays),
    pdfPath: null,
    createdAt: now,
    updatedAt: now,
    lines: sampleLines,
    workDays: []
  };

  return buildInvoicePdfBuffer({
    invoice: previewInvoice,
    settings: params.invoiceSettings as unknown as InvoiceSettings
  });
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + Math.max(0, days));
  return next;
}

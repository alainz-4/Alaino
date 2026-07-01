import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "./prisma.js";

type WorkspaceDb = Pick<PrismaClient, "userProfile" | "freelanceSettings" | "financeSettings" | "invoiceSettings">;

export interface WorkspaceState {
  profile: Awaited<ReturnType<typeof ensureWorkspaceProfile>>;
  freelanceSettings: Awaited<ReturnType<typeof ensureFreelanceSettings>>;
  financeSettings: Awaited<ReturnType<typeof ensureFinanceSettings>>;
  invoiceSettings: Awaited<ReturnType<typeof ensureInvoiceSettings>>;
}

const DEFAULT_PROFILE = {
  profilePreset: "FRENCH_FREELANCER" as const,
  fullName: "Your name",
  legalStatus: "EI / micro-entrepreneur",
  siren: null,
  siret: null,
  commercialRegisterNumber: null,
  taxId: null,
  addressLine1: "",
  addressLine2: null,
  postalCode: "",
  city: "",
  country: "France",
  email: null,
  phone: null
};

const DEFAULT_FREELANCE_SETTINGS = {
  defaultDailyRate: new Prisma.Decimal(0),
  standardWorkingDays: 20,
  timezone: "Europe/Paris",
  defaultCurrency: "EUR"
};

const DEFAULT_FINANCE_SETTINGS = {
  monthlyEssentialExpenses: new Prisma.Decimal(0),
  monthlyWants: new Prisma.Decimal(0),
  emergencyFundMonths: 6,
  currentReserves: new Prisma.Decimal(0),
  savingsGoalMonthly: new Prisma.Decimal(0),
  needsPercent: new Prisma.Decimal(50),
  wantsPercent: new Prisma.Decimal(30),
  savingsPercent: new Prisma.Decimal(20),
  monthlyLifestyleTarget: new Prisma.Decimal(0),
  urssafReservePercent: new Prisma.Decimal(25.6),
  incomeTaxReservePercent: new Prisma.Decimal(2.2)
};

const DEFAULT_INVOICE_SETTINGS = {
  invoicePrefix: "INV",
  lastInvoiceSequence: 0,
  defaultCurrency: "EUR",
  defaultPaymentTermsDays: 30,
  latePaymentRate: new Prisma.Decimal(12),
  recoveryChargeAmount: new Prisma.Decimal(40),
  vatMode: "EXEMPT" as const,
  vatRate: new Prisma.Decimal(20),
  vatExemptionMention: "TVA non applicable, art. 293 B du CGI",
  logoUrl: null,
  signatureUrl: null,
  primaryColor: "#17324d",
  secondaryColor: "#eaf0f6",
  bankDetails: null,
  termsAndConditions: null
};

export async function ensureWorkspaceProfile(db: WorkspaceDb = prisma) {
  const existing = await db.userProfile.findFirst({
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
  });
  if (existing) {
    return existing;
  }

  return db.userProfile.create({ data: DEFAULT_PROFILE });
}

export async function ensureFreelanceSettings(db: WorkspaceDb = prisma) {
  const profile = await ensureWorkspaceProfile(db);
  return db.freelanceSettings.upsert({
    where: { userProfileId: profile.id },
    create: { userProfileId: profile.id, ...DEFAULT_FREELANCE_SETTINGS },
    update: {}
  });
}

export async function ensureFinanceSettings(db: WorkspaceDb = prisma) {
  const profile = await ensureWorkspaceProfile(db);
  return db.financeSettings.upsert({
    where: { userProfileId: profile.id },
    create: { userProfileId: profile.id, ...DEFAULT_FINANCE_SETTINGS },
    update: {}
  });
}

export async function ensureInvoiceSettings(db: WorkspaceDb = prisma) {
  const profile = await ensureWorkspaceProfile(db);
  return db.invoiceSettings.upsert({
    where: { userProfileId: profile.id },
    create: { userProfileId: profile.id, ...DEFAULT_INVOICE_SETTINGS },
    update: {}
  });
}

export async function ensureWorkspaceState(db: WorkspaceDb = prisma): Promise<WorkspaceState> {
  const profile = await ensureWorkspaceProfile(db);
  const [freelanceSettings, financeSettings, invoiceSettings] = await Promise.all([
    ensureFreelanceSettings(db),
    ensureFinanceSettings(db),
    ensureInvoiceSettings(db)
  ]);

  return {
    profile,
    freelanceSettings,
    financeSettings,
    invoiceSettings
  };
}

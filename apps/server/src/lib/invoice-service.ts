import type { Contract, Prisma, UserProfile, WorkDay } from "@prisma/client";
import { addDays, format } from "date-fns";
import { calculateInvoiceTotals, roundMoney } from "@freelance/shared";
import { buildInvoiceNumber } from "./invoice-number.js";
import { ensureWorkspaceState } from "./workspace.js";
import { prisma } from "./prisma.js";
import { AppError } from "./errors.js";
import { toDecimal, toNumber } from "./number.js";

export async function createInvoiceDraftFromWorkDays(params: {
  clientId: string;
  startDate: Date;
  endDate: Date;
  contractId?: string | null;
  notes?: string | null;
  issueDate?: Date;
}) {
  return prisma.$transaction(async (tx) => {
    const state = await ensureWorkspaceState(tx);
    const client = await tx.client.findUnique({ where: { id: params.clientId } });
    if (!client) {
      throw new AppError(404, "Client not found");
    }

    const workDays = await tx.workDay.findMany({
      where: {
        userProfileId: state.profile.id,
        workDate: {
          gte: params.startDate,
          lte: params.endDate
        },
        status: "WORKING",
        invoiceId: null,
        ...(params.contractId ? { contractId: params.contractId } : {})
      },
      include: {
        contract: true
      },
      orderBy: {
        workDate: "asc"
      }
    });

    if (workDays.length === 0) {
      throw new AppError(400, "No uninvoiced working days were found in the selected range");
    }

    const grouped = groupWorkDays(workDays, state.profile, state.freelanceSettings.defaultDailyRate);
    const invoiceSettings = await tx.invoiceSettings.findUnique({
      where: { userProfileId: state.profile.id }
    });

    if (!invoiceSettings) {
      throw new AppError(500, "Invoice settings are not available");
    }

    const sequenceNumber = invoiceSettings.lastInvoiceSequence + 1;
    const invoiceNumber = buildInvoiceNumber(invoiceSettings.invoicePrefix, sequenceNumber);
    const issueDate = params.issueDate ?? new Date();
    const servicePeriodStart = workDays[0].workDate;
    const servicePeriodEnd = workDays[workDays.length - 1].workDate;
    const distinctContractIds = new Set(grouped.map((line) => line.contractId).filter((value): value is string => Boolean(value)));
    const invoiceContractId = params.contractId ?? (distinctContractIds.size === 1 ? Array.from(distinctContractIds)[0] : null);
    const totals = calculateInvoiceTotals({
      lines: grouped.map((line) => ({ quantityDays: line.quantityDays, unitPrice: line.unitPrice })),
      vatRate: toNumber(invoiceSettings.vatRate),
      vatApplicable: invoiceSettings.vatMode === "APPLICABLE"
    });

    const invoice = await tx.invoice.create({
      data: {
        userProfileId: state.profile.id,
        clientId: client.id,
        contractId: invoiceContractId,
        invoiceSeries: invoiceSettings.invoicePrefix,
        invoiceNumber,
        sequenceNumber,
        issueDate,
        servicePeriodStart,
        servicePeriodEnd,
        subtotal: toDecimal(totals.subtotal),
        vatMode: invoiceSettings.vatMode,
        vatRate: toDecimal(invoiceSettings.vatMode === "APPLICABLE" ? toNumber(invoiceSettings.vatRate) : 0),
        vatAmount: toDecimal(totals.vatAmount),
        total: toDecimal(totals.total),
        currency: invoiceSettings.defaultCurrency,
        paymentTermsDays: invoiceSettings.defaultPaymentTermsDays,
        latePaymentRate: invoiceSettings.latePaymentRate,
        recoveryChargeAmount: invoiceSettings.recoveryChargeAmount,
        vatExemptionMention: invoiceSettings.vatMode === "EXEMPT" ? invoiceSettings.vatExemptionMention : null,
        issuerName: state.profile.fullName,
        issuerLegalStatus: state.profile.legalStatus,
        issuerSiren: state.profile.profilePreset === "FRENCH_FREELANCER" ? state.profile.siren : null,
        issuerSiret: state.profile.profilePreset === "FRENCH_FREELANCER" ? state.profile.siret : null,
        issuerCommercialRegisterNumber:
          state.profile.profilePreset === "LEBANESE_COMPANY" ? state.profile.commercialRegisterNumber : null,
        issuerTaxId: state.profile.profilePreset === "LEBANESE_COMPANY" ? state.profile.taxId : null,
        issuerAddressLine1: state.profile.addressLine1,
        issuerAddressLine2: state.profile.addressLine2,
        issuerPostalCode: state.profile.postalCode,
        issuerCity: state.profile.city,
        issuerCountry: state.profile.country,
        clientName: client.name,
        clientLegalName: client.legalName,
        clientAddressLine1: client.addressLine1,
        clientAddressLine2: client.addressLine2,
        clientPostalCode: client.postalCode,
        clientCity: client.city,
        clientCountry: client.country,
        clientVatNumber: client.vatNumber,
        notes: params.notes ?? null,
        dueDate: addDays(issueDate, invoiceSettings.defaultPaymentTermsDays),
        lines: {
          create: grouped.map((line, index) => ({
            description: line.description,
            quantityDays: toDecimal(line.quantityDays),
            unitPrice: toDecimal(line.unitPrice),
            total: toDecimal(line.total),
            sortOrder: index
          }))
        }
      },
      include: {
        lines: true
      }
    });

    await tx.invoiceSettings.update({
      where: { userProfileId: state.profile.id },
      data: { lastInvoiceSequence: sequenceNumber }
    });

    await tx.workDay.updateMany({
      where: {
        id: { in: workDays.map((day) => day.id) }
      },
      data: {
        invoiceId: invoice.id
      }
    });

    return invoice;
  });
}

function groupWorkDays(workDays: Array<WorkDay & { contract: Contract | null }>, profile: UserProfile, defaultRate: Prisma.Decimal) {
  const map = new Map<string, {
    contractId: string | null;
    contractTitle: string;
    description: string;
    quantityDays: number;
    unitPrice: number;
    total: number;
    firstDate: Date;
    lastDate: Date;
  }>();

  for (const workDay of workDays) {
    const rate = toNumber(workDay.dailyRate ?? workDay.contract?.dailyRate ?? defaultRate);
    const contractTitle = workDay.contract?.title ?? "Billable freelance work";
    const key = [workDay.contractId ?? "none", rate].join("::");
    const existing = map.get(key);
    if (existing) {
      existing.quantityDays += 1;
      existing.total = roundMoney(existing.quantityDays * existing.unitPrice);
      existing.lastDate = workDay.workDate;
      existing.description = `${existing.contractTitle} - ${format(existing.firstDate, "dd/MM/yyyy")} to ${format(workDay.workDate, "dd/MM/yyyy")}`;
      continue;
    }

    map.set(key, {
      contractId: workDay.contractId ?? null,
      contractTitle,
      description: contractTitle,
      quantityDays: 1,
      unitPrice: rate,
      total: rate,
      firstDate: workDay.workDate,
      lastDate: workDay.workDate
    });
  }

  return Array.from(map.values()).map((line) => ({
    ...line,
      description:
        line.quantityDays > 1
        ? `${line.contractTitle} - ${format(line.firstDate, "dd/MM/yyyy")} to ${format(line.lastDate, "dd/MM/yyyy")}`
        : `${line.contractTitle} - ${format(line.firstDate, "dd/MM/yyyy")}`,
    total: roundMoney(line.quantityDays * line.unitPrice)
  }));
}

export async function recalculateInvoiceTotals(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { lines: true }
  });

  if (!invoice) {
    throw new AppError(404, "Invoice not found");
  }

  const totals = calculateInvoiceTotals({
    lines: invoice.lines.map((line) => ({
      quantityDays: toNumber(line.quantityDays),
      unitPrice: toNumber(line.unitPrice)
    })),
    vatRate: toNumber(invoice.vatRate),
    vatApplicable: invoice.vatMode === "APPLICABLE"
  });

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotal: toDecimal(totals.subtotal),
      vatAmount: toDecimal(totals.vatAmount),
      total: toDecimal(totals.total)
    }
  });
}

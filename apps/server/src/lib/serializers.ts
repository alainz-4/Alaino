import type {
  Client,
  Contract,
  Expense,
  FinanceSettings,
  FreelanceSettings,
  Invoice,
  InvoiceLine,
  InvoiceSettings,
  PaymentLog,
  UserProfile,
  WorkDay
} from "@prisma/client";
import { toDateOnly } from "./dates.js";
import { toNumber } from "./number.js";

export function serializeUserProfile(item: UserProfile) {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

export function serializeFreelanceSettings(item: FreelanceSettings) {
  return {
    ...item,
    defaultDailyRate: toNumber(item.defaultDailyRate),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

export function serializeFinanceSettings(item: FinanceSettings) {
  return {
    ...item,
    monthlyEssentialExpenses: toNumber(item.monthlyEssentialExpenses),
    monthlyWants: toNumber(item.monthlyWants),
    currentReserves: toNumber(item.currentReserves),
    savingsGoalMonthly: toNumber(item.savingsGoalMonthly),
    needsPercent: toNumber(item.needsPercent),
    wantsPercent: toNumber(item.wantsPercent),
    savingsPercent: toNumber(item.savingsPercent),
    monthlyLifestyleTarget: toNumber(item.monthlyLifestyleTarget),
    urssafReservePercent: toNumber(item.urssafReservePercent),
    incomeTaxReservePercent: toNumber(item.incomeTaxReservePercent),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

export function serializeInvoiceSettings(item: InvoiceSettings) {
  return {
    ...item,
    latePaymentRate: toNumber(item.latePaymentRate),
    recoveryChargeAmount: toNumber(item.recoveryChargeAmount),
    vatRate: toNumber(item.vatRate),
    signatureUrl: item.signatureUrl,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

export function serializeClient(item: Client) {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

export function serializeContract(item: Contract) {
  return {
    ...item,
    dailyRate: item.dailyRate === null ? null : toNumber(item.dailyRate),
    monthlyRetainerAmount: item.monthlyRetainerAmount === null ? null : toNumber(item.monthlyRetainerAmount),
    fixedProjectAmount: item.fixedProjectAmount === null ? null : toNumber(item.fixedProjectAmount),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    startDate: item.startDate.toISOString(),
    endDate: item.endDate?.toISOString() ?? null,
    fixedProjectDate: item.fixedProjectDate?.toISOString() ?? null
  };
}

export function serializeWorkDay(item: WorkDay) {
  return {
    ...item,
    workDate: toDateOnly(item.workDate),
    dailyRate: item.dailyRate === null ? null : toNumber(item.dailyRate),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

export function serializeExpense(item: Expense) {
  return {
    ...item,
    amount: toNumber(item.amount),
    dueDate: item.dueDate.toISOString(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

export function serializeInvoiceLine(item: InvoiceLine) {
  return {
    ...item,
    quantityDays: toNumber(item.quantityDays),
    unitPrice: toNumber(item.unitPrice),
    total: toNumber(item.total),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

export function serializeInvoice(item: Invoice & { lines?: InvoiceLine[] }) {
  return {
    ...item,
    subtotal: toNumber(item.subtotal),
    vatRate: toNumber(item.vatRate),
    vatAmount: toNumber(item.vatAmount),
    total: toNumber(item.total),
    issueDate: item.issueDate.toISOString(),
    servicePeriodStart: item.servicePeriodStart.toISOString(),
    servicePeriodEnd: item.servicePeriodEnd.toISOString(),
    paidAt: item.paidAt?.toISOString() ?? null,
    dueDate: item.dueDate?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    lines: item.lines?.map(serializeInvoiceLine) ?? []
  };
}

export function serializePaymentLog(
  item: PaymentLog & { client?: Client | null; invoice?: Invoice | null }
) {
  return {
    ...item,
    amount: toNumber(item.amount),
    receivedAt: item.receivedAt.toISOString(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    client: item.client
      ? {
          id: item.client.id,
          name: item.client.name
        }
      : null,
    invoice: item.invoice
      ? {
          id: item.invoice.id,
          invoiceNumber: item.invoice.invoiceNumber,
          total: toNumber(item.invoice.total),
          status: item.invoice.status
        }
      : null
  };
}

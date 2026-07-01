import {
  buildAccountingAdvice,
  buildAssistantRecommendations,
  calculateMonthlyGoalPlan,
  calculateAccountingPlan,
  calculateBudgetRecommendation,
  calculateEmergencyFundTarget,
  calculateRequiredMonthlyIncome,
  calculateRunwayMonths,
  forecastExpenseMonths
} from "@freelance/shared";
import type { Contract, Expense, Invoice, PaymentLog, WorkDay } from "@prisma/client";
import { prisma } from "./prisma.js";
import { ensureWorkspaceState } from "./workspace.js";
import { toNumber } from "./number.js";
import { parseMonthKey } from "./dates.js";

export async function buildDashboardSummary(monthKey: string) {
  const state = await ensureWorkspaceState();
  const range = parseMonthKey(monthKey);

  const [workDays, invoices, contracts, expenses, paymentLogs] = await Promise.all([
    prisma.workDay.findMany({
      where: {
        userProfileId: state.profile.id,
        workDate: { gte: range.start, lte: range.end }
      },
      include: { contract: true }
    }),
    prisma.invoice.findMany({
      where: { userProfileId: state.profile.id },
      include: { lines: true }
    }),
    prisma.contract.findMany({
      where: { userProfileId: state.profile.id, active: true }
    }),
    prisma.expense.findMany({
      where: { userProfileId: state.profile.id },
      orderBy: { dueDate: "asc" }
    }),
    prisma.paymentLog.findMany({
      where: {
        userProfileId: state.profile.id,
        receivedAt: { gte: range.start, lte: range.end }
      },
      include: { client: true, invoice: true },
      orderBy: { receivedAt: "desc" },
      take: 8
    })
  ]);

  const typedWorkDays = workDays as Array<WorkDay & { contract: Contract | null }>;
  const typedContracts = contracts as Contract[];
  const typedInvoices = invoices as Invoice[];
  const typedExpenses = expenses as Expense[];
  const typedPayments = paymentLogs as Array<
    PaymentLog & {
      client: { id: string; name: string } | null;
      invoice: { id: string; invoiceNumber: string; total: Invoice["total"]; status: string } | null;
    }
  >;

  const workingDaysIncome = typedWorkDays
    .filter((day) => day.status === "WORKING")
    .reduce(
      (sum, day) => sum + toNumber(day.dailyRate ?? day.contract?.dailyRate ?? state.freelanceSettings.defaultDailyRate),
      0
    );

  const retainerIncome = typedContracts
    .filter((contract) => contract.startDate <= range.end)
    .filter((contract) => !contract.endDate || contract.endDate >= range.start)
    .filter((contract) => contract.paymentType === "RETAINER")
    .reduce((sum, contract) => sum + toNumber(contract.monthlyRetainerAmount), 0);

  const fixedProjectIncome = typedContracts
    .filter((contract) => contract.startDate <= range.end)
    .filter((contract) => !contract.endDate || contract.endDate >= range.start)
    .filter((contract) => contract.paymentType === "FIXED")
    .filter((contract) => contract.fixedProjectDate && isSameMonth(contract.fixedProjectDate, range.start))
    .reduce((sum, contract) => sum + toNumber(contract.fixedProjectAmount), 0);

  const projectedIncome = workingDaysIncome + retainerIncome + fixedProjectIncome;
  const receivedThisMonth = typedPayments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
  const expenseForecast = forecastExpenseMonths(
    typedExpenses.map((expense) => ({
      title: expense.title,
      category: expense.category,
      amount: toNumber(expense.amount),
      dueDate: expense.dueDate.toISOString().slice(0, 10),
      recurrence: expense.recurrence as "ONE_TIME" | "MONTHLY",
      status: expense.status as "PLANNED" | "PAID"
    })),
    monthKey,
    3
  );
  const currentMonthExpense = expenseForecast[0] ?? { month: monthKey, planned: 0, paid: 0, total: 0 };
  const nextThreeMonthsExpenses = expenseForecast.slice(1).reduce((sum, row) => sum + row.total, 0);
  const emergencyFundTarget = calculateEmergencyFundTarget(
    toNumber(state.financeSettings.monthlyEssentialExpenses),
    state.financeSettings.emergencyFundMonths
  );
  const runwayMonths = calculateRunwayMonths(
    toNumber(state.financeSettings.currentReserves),
    toNumber(state.financeSettings.monthlyEssentialExpenses)
  );
  const requiredMonthlyIncome = calculateRequiredMonthlyIncome({
    essentialExpenses: toNumber(state.financeSettings.monthlyEssentialExpenses),
    lifestyleSpending: toNumber(state.financeSettings.monthlyWants),
    savingsGoalMonthly: toNumber(state.financeSettings.savingsGoalMonthly)
  });
  const budgetRecommendation = calculateBudgetRecommendation(projectedIncome, {
    needsPercent: toNumber(state.financeSettings.needsPercent),
    wantsPercent: toNumber(state.financeSettings.wantsPercent),
    savingsPercent: toNumber(state.financeSettings.savingsPercent)
  });
  const accountingPlan = calculateAccountingPlan({
    projectedIncome,
    essentials: toNumber(state.financeSettings.monthlyEssentialExpenses),
    wants: toNumber(state.financeSettings.monthlyWants),
    savingsGoalMonthly: toNumber(state.financeSettings.savingsGoalMonthly),
    currentReserves: toNumber(state.financeSettings.currentReserves),
    emergencyFundMonths: state.financeSettings.emergencyFundMonths,
    expensesThisMonth: currentMonthExpense.total,
    nextThreeMonthsExpenses: nextThreeMonthsExpenses,
    urssafReservePercent: toNumber(state.financeSettings.urssafReservePercent),
    incomeTaxReservePercent: toNumber(state.financeSettings.incomeTaxReservePercent)
  });
  const monthlyGoalPlan = calculateMonthlyGoalPlan({
    projectedIncome,
    essentials: toNumber(state.financeSettings.monthlyEssentialExpenses),
    wants: toNumber(state.financeSettings.monthlyWants),
    savingsGoalMonthly: toNumber(state.financeSettings.savingsGoalMonthly),
    currentReserves: toNumber(state.financeSettings.currentReserves),
    emergencyFundMonths: state.financeSettings.emergencyFundMonths,
    expensesThisMonth: currentMonthExpense.total,
    nextThreeMonthsExpenses,
    urssafReservePercent: toNumber(state.financeSettings.urssafReservePercent),
    incomeTaxReservePercent: toNumber(state.financeSettings.incomeTaxReservePercent)
  });

  const averageDailyRate =
    typedWorkDays.length > 0
      ? workingDaysIncome / Math.max(1, typedWorkDays.filter((day) => day.status === "WORKING").length)
      : toNumber(state.freelanceSettings.defaultDailyRate);

  const assistantRecommendations = buildAssistantRecommendations({
    projectedIncome,
    essentialExpenses: toNumber(state.financeSettings.monthlyEssentialExpenses),
    currentReserves: toNumber(state.financeSettings.currentReserves),
    emergencyFundTarget,
    runwayMonths,
    averageDailyRate,
    requiredMonthlyIncome,
    targetMonths: state.financeSettings.emergencyFundMonths
  }).concat(
    buildAccountingAdvice({
      projectedIncome,
      essentialExpenses: toNumber(state.financeSettings.monthlyEssentialExpenses),
      monthlyWants: toNumber(state.financeSettings.monthlyWants),
      savingsGoalMonthly: toNumber(state.financeSettings.savingsGoalMonthly),
      currentReserves: toNumber(state.financeSettings.currentReserves),
      emergencyFundMonths: state.financeSettings.emergencyFundMonths,
      expensesThisMonth: currentMonthExpense.total,
      nextThreeMonthsExpenses,
      urssafReservePercent: toNumber(state.financeSettings.urssafReservePercent),
      incomeTaxReservePercent: toNumber(state.financeSettings.incomeTaxReservePercent),
      profilePreset: state.profile.profilePreset === "LEBANESE_COMPANY" ? "LEBANESE_COMPANY" : "FRENCH_FREELANCER",
      monthlyLifestyleTarget: toNumber(state.financeSettings.monthlyLifestyleTarget)
    })
  );

  const invoiceTotals = typedInvoices.reduce(
    (acc: { all: number; byStatus: Record<string, number> }, invoice: Invoice) => {
      const total = toNumber(invoice.total);
      acc.all += total;
      acc.byStatus[invoice.status] = (acc.byStatus[invoice.status] ?? 0) + total;
      return acc;
    },
    {
      all: 0,
      byStatus: {} as Record<string, number>
    }
  );

  return {
    month: monthKey,
    projectedIncome,
    workingDaysIncome,
    retainerIncome,
    fixedProjectIncome,
    invoiceTotals,
    receivedThisMonth,
    recentPayments: typedPayments.map((payment) => ({
      id: payment.id,
      kind: payment.kind,
      title: payment.title,
      amount: toNumber(payment.amount),
      currency: payment.currency,
      receivedAt: payment.receivedAt.toISOString(),
      method: payment.method,
      notes: payment.notes,
      client: payment.client ? { id: payment.client.id, name: payment.client.name } : null,
      invoice: payment.invoice
        ? {
            id: payment.invoice.id,
            invoiceNumber: payment.invoice.invoiceNumber,
            total: toNumber(payment.invoice.total),
            status: payment.invoice.status
          }
        : null
    })),
    reserves: toNumber(state.financeSettings.currentReserves),
    runwayMonths,
    emergencyFundTarget,
    budgetRecommendation,
    requiredMonthlyIncome,
    assistantRecommendations,
    expenseSummary: {
      currentMonth: currentMonthExpense,
      nextThreeMonths: expenseForecast.slice(1),
      totalPlannedThisMonth: currentMonthExpense.total,
      totalPlannedNextThreeMonths: nextThreeMonthsExpenses,
      nextThreeMonthsExpenses,
      urssafReserve: accountingPlan.urssafReserve,
      incomeTaxReserve: accountingPlan.incomeTaxReserve,
      emergencyFundCatchUp: accountingPlan.emergencyFundCatchUp,
      safeToSpend: accountingPlan.safeToSpend
    },
    monthlyGoalPlan,
    workingDaysCount: typedWorkDays.filter((day) => day.status === "WORKING").length,
    offDaysCount: typedWorkDays.filter((day) => day.status === "OFF").length,
    recommendedDailyRate: calculateRecommendedDailyRate({
      requiredMonthlyIncome,
      workDays: typedWorkDays
    })
  };
}

function isSameMonth(date: Date, monthStart: Date): boolean {
  return date.getUTCFullYear() === monthStart.getUTCFullYear() && date.getUTCMonth() === monthStart.getUTCMonth();
}

function calculateRecommendedDailyRate(params: { requiredMonthlyIncome: number; workDays: Array<{ status: string }> }) {
  const workingDays = Math.max(1, params.workDays.filter((day) => day.status === "WORKING").length);
  return params.requiredMonthlyIncome / workingDays;
}

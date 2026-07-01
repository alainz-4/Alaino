import type {
  AccountingAdvice,
  AccountingReservePlan,
  CashflowScenario,
  AssistantRecommendation,
  BudgetRecommendation,
  BudgetSplit,
  ExpenseAlert,
  ExpenseForecastMonth,
  ExpenseRecord,
  InvoiceLineDraft,
  InvoiceTotals,
  MonthlyGoalPlan
} from "./types.js";

export const DEFAULT_BUDGET_SPLIT: BudgetSplit = {
  needsPercent: 50,
  wantsPercent: 30,
  savingsPercent: 20
};

export function roundMoney(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export function calculateEmergencyFundTarget(
  essentialExpenses: number,
  desiredMonths = 6
): number {
  return roundMoney(Math.max(0, essentialExpenses) * Math.max(0, desiredMonths));
}

export function calculateRunwayMonths(
  currentReserves: number,
  essentialExpenses: number
): number {
  if (essentialExpenses <= 0) {
    return 0;
  }

  return roundMoney(Math.max(0, currentReserves) / essentialExpenses);
}

export function normalizeBudgetSplit(split: BudgetSplit): BudgetSplit {
  const needs = Math.max(0, split.needsPercent);
  const wants = Math.max(0, split.wantsPercent);
  const savings = Math.max(0, split.savingsPercent);
  const total = needs + wants + savings || 100;

  return {
    needsPercent: roundMoney((needs / total) * 100),
    wantsPercent: roundMoney((wants / total) * 100),
    savingsPercent: roundMoney((savings / total) * 100)
  };
}

export function calculateBudgetRecommendation(
  monthlyIncome: number,
  split: BudgetSplit = DEFAULT_BUDGET_SPLIT
): BudgetRecommendation {
  const normalized = normalizeBudgetSplit(split);

  return {
    needs: roundMoney(monthlyIncome * (normalized.needsPercent / 100)),
    wants: roundMoney(monthlyIncome * (normalized.wantsPercent / 100)),
    savings: roundMoney(monthlyIncome * (normalized.savingsPercent / 100))
  };
}

export function calculateRequiredMonthlyIncome(params: {
  essentialExpenses: number;
  lifestyleSpending: number;
  savingsGoalMonthly: number;
}): number {
  return roundMoney(
    Math.max(0, params.essentialExpenses) +
      Math.max(0, params.lifestyleSpending) +
      Math.max(0, params.savingsGoalMonthly)
  );
}

export function calculateMinDailyRate(
  requiredMonthlyIncome: number,
  workingDays: number
): number {
  if (workingDays <= 0) {
    return 0;
  }

  return roundMoney(requiredMonthlyIncome / workingDays);
}

export function calculateRequiredWorkingDays(
  requiredMonthlyIncome: number,
  dailyRate: number
): number {
  if (dailyRate <= 0) {
    return 0;
  }

  return Math.ceil(requiredMonthlyIncome / dailyRate);
}

function monthKeyToUtcDate(monthKey: string): Date {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) {
    throw new Error(`Invalid month key: ${monthKey}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  return new Date(Date.UTC(year, month - 1, 1, 12, 0, 0, 0));
}

function addMonthsUtc(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 12, 0, 0, 0));
}

function formatMonthKeyUtc(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthRangeUtc(monthKey: string): { start: Date; end: Date } {
  const start = monthKeyToUtcDate(monthKey);
  const end = addMonthsUtc(start, 1);
  return { start, end };
}

function toUtcDateOnly(input: string): Date {
  const date = new Date(`${input}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${input}`);
  }

  return date;
}

function formatDateOnlyUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDaysUtc(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days, 12, 0, 0, 0));
}

export function forecastExpenseMonths(
  expenses: ExpenseRecord[],
  monthKey: string,
  horizonMonths = 3
): ExpenseForecastMonth[] {
  const startMonth = monthKeyToUtcDate(monthKey);
  const monthKeys = Array.from({ length: Math.max(1, horizonMonths) }, (_value, index) =>
    formatMonthKeyUtc(addMonthsUtc(startMonth, index))
  );

  const rows = monthKeys.map((month) => ({ month, planned: 0, paid: 0, total: 0 }));

  for (const expense of expenses) {
    const dueDate = toUtcDateOnly(expense.dueDate);
    const isMonthly = expense.recurrence === "MONTHLY";

    for (const row of rows) {
      const { start, end } = monthRangeUtc(row.month);
      const dueWithinMonth = dueDate >= start && dueDate < end;
      const recurringApplies = isMonthly && dueDate < end;

      if (!dueWithinMonth && !recurringApplies) {
        continue;
      }

      if (expense.status === "PAID") {
        row.paid = roundMoney(row.paid + Math.max(0, expense.amount));
      } else {
        row.planned = roundMoney(row.planned + Math.max(0, expense.amount));
      }

      row.total = roundMoney(row.planned + row.paid);
    }
  }

  return rows;
}

export function buildExpenseAlerts(
  expenses: ExpenseRecord[],
  monthKey: string,
  warningDays = 14
): ExpenseAlert[] {
  const today = toUtcDateOnly(formatDateOnlyUtc(new Date()));
  const warningEnd = addDaysUtc(today, Math.max(0, warningDays));
  const monthStart = monthKeyToUtcDate(monthKey);
  const monthEnd = addMonthsUtc(monthStart, 1);

  const alerts: ExpenseAlert[] = [];

  for (const expense of expenses) {
    if (expense.status === "PAID") {
      continue;
    }

    const dueDate = toUtcDateOnly(expense.dueDate);
    const amount = roundMoney(Math.max(0, expense.amount));
    const isCurrentMonth = dueDate >= monthStart && dueDate < monthEnd;
    const isOverdue = dueDate < today;
    const isDueSoon = dueDate >= today && dueDate <= warningEnd;

    if (isOverdue) {
      alerts.push({
        kind: "OVERDUE",
        severity: "danger",
        title: `${expense.title} is overdue`,
        message: `${expense.category} payment of ${amount.toFixed(2)} is past due and should be covered immediately.`,
        dueDate: expense.dueDate,
        amount
      });
      continue;
    }

    if (isDueSoon) {
      alerts.push({
        kind: "DUE_SOON",
        severity: "warning",
        title: `${expense.title} is due soon`,
        message: `${expense.category} payment of ${amount.toFixed(2)} is due by ${dueDate.toISOString().slice(0, 10)}.`,
        dueDate: expense.dueDate,
        amount
      });
      continue;
    }

    if (expense.recurrence === "MONTHLY" && isCurrentMonth) {
      alerts.push({
        kind: "RECURRING",
        severity: "info",
        title: `${expense.title} repeats monthly`,
        message: `Keep ${amount.toFixed(2)} aside each month for this recurring item.`,
        dueDate: expense.dueDate,
        amount
      });
      continue;
    }

    if (isCurrentMonth) {
      alerts.push({
        kind: "UPCOMING",
        severity: "info",
        title: `${expense.title} is coming this month`,
        message: `${expense.category} payment of ${amount.toFixed(2)} should remain in your monthly cashflow plan.`,
        dueDate: expense.dueDate,
        amount
      });
    }
  }

  return alerts.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function calculateMonthlyGoalPlan(params: {
  projectedIncome: number;
  essentials: number;
  wants: number;
  savingsGoalMonthly: number;
  currentReserves: number;
  emergencyFundMonths: number;
  expensesThisMonth: number;
  nextThreeMonthsExpenses: number;
  urssafReservePercent: number;
  incomeTaxReservePercent: number;
}): MonthlyGoalPlan {
  const accountingPlan = calculateAccountingPlan(params);
  const monthlySavingsTarget = roundMoney(Math.max(0, params.savingsGoalMonthly) + accountingPlan.emergencyFundCatchUp);
  const monthlyProtectedTotal = roundMoney(
    Math.max(0, params.essentials) +
      Math.max(0, params.wants) +
      monthlySavingsTarget +
      accountingPlan.urssafReserve +
      accountingPlan.incomeTaxReserve
  );

  return {
    projectedIncome: accountingPlan.projectedIncome,
    essentialExpenses: roundMoney(Math.max(0, params.essentials)),
    monthlyWants: roundMoney(Math.max(0, params.wants)),
    savingsGoalMonthly: roundMoney(Math.max(0, params.savingsGoalMonthly)),
    emergencyFundTarget: accountingPlan.emergencyFundTarget,
    emergencyFundCatchUp: accountingPlan.emergencyFundCatchUp,
    urssafReserve: accountingPlan.urssafReserve,
    incomeTaxReserve: accountingPlan.incomeTaxReserve,
    monthlySavingsTarget,
    monthlyProtectedTotal,
    flexibleSpendingCap: accountingPlan.safeToSpend
  };
}

export function buildCashflowScenarios(params: {
  baseProjectedIncome: number;
  safeToSpend: number;
  requiredMonthlyIncome: number;
  dailyRate: number;
  workingDays: number;
  extraExpense: number;
  incomeShockPercent: number;
  extraDaysOff: number;
}): CashflowScenario[] {
  const scenarios: CashflowScenario[] = [];
  const baselineRemaining = roundMoney(Math.max(0, params.safeToSpend));

  scenarios.push({
    label: "Baseline",
    message: "This is your current projected month with the existing savings and tax goals.",
    projectedIncome: roundMoney(Math.max(0, params.baseProjectedIncome)),
    safeToSpend: baselineRemaining,
    remainingAfterGoals: baselineRemaining,
    incomeShockPercent: 0,
    extraExpense: 0,
    extraDaysOff: 0,
    shortfall: Math.max(0, params.requiredMonthlyIncome - params.baseProjectedIncome)
  });

  const shockPercent = Math.max(0, params.incomeShockPercent);
  const shockedIncome = roundMoney(Math.max(0, params.baseProjectedIncome * (1 - shockPercent / 100)));
  const shockShortfall = Math.max(0, params.requiredMonthlyIncome - shockedIncome);
  scenarios.push({
    label: `Income down ${shockPercent.toFixed(0)}%`,
    message: shockShortfall > 0
      ? `If income drops, you would need ${shockShortfall.toFixed(2)} more to stay on target.`
      : `A ${shockPercent.toFixed(0)}% income drop still keeps you on track.`,
    projectedIncome: shockedIncome,
    safeToSpend: roundMoney(Math.max(0, baselineRemaining - (params.baseProjectedIncome - shockedIncome))),
    remainingAfterGoals: roundMoney(Math.max(0, baselineRemaining - (params.baseProjectedIncome - shockedIncome))),
    incomeShockPercent: shockPercent,
    extraExpense: 0,
    extraDaysOff: 0,
    shortfall: shockShortfall
  });

  const extraExpense = roundMoney(Math.max(0, params.extraExpense));
  scenarios.push({
    label: "Extra purchase",
    message:
      extraExpense > 0
        ? `A one-off expense of ${extraExpense.toFixed(2)} would reduce your buffer by the same amount.`
        : "Set an extra expense amount to test a future purchase.",
    projectedIncome: roundMoney(Math.max(0, params.baseProjectedIncome)),
    safeToSpend: roundMoney(Math.max(0, baselineRemaining - extraExpense)),
    remainingAfterGoals: roundMoney(Math.max(0, baselineRemaining - extraExpense)),
    incomeShockPercent: 0,
    extraExpense,
    extraDaysOff: 0,
    shortfall: Math.max(0, extraExpense - baselineRemaining)
  });

  const extraDaysOff = Math.max(0, params.extraDaysOff);
  const lostIncome = roundMoney(Math.max(0, params.dailyRate) * extraDaysOff);
  const daysOffIncome = roundMoney(Math.max(0, params.baseProjectedIncome - lostIncome));
  scenarios.push({
    label: "Extra days off",
    message:
      extraDaysOff > 0
        ? `Taking ${extraDaysOff} extra days off lowers your projected income by about ${lostIncome.toFixed(2)}.`
        : "Set extra days off to see how much income you can safely give up.",
    projectedIncome: daysOffIncome,
    safeToSpend: roundMoney(Math.max(0, baselineRemaining - lostIncome)),
    remainingAfterGoals: roundMoney(Math.max(0, baselineRemaining - lostIncome)),
    incomeShockPercent: 0,
    extraExpense: 0,
    extraDaysOff,
    shortfall: Math.max(0, params.requiredMonthlyIncome - daysOffIncome)
  });

  return scenarios;
}

export function calculateAccountingPlan(params: {
  projectedIncome: number;
  essentials: number;
  wants: number;
  savingsGoalMonthly: number;
  currentReserves: number;
  emergencyFundMonths: number;
  expensesThisMonth: number;
  nextThreeMonthsExpenses: number;
  urssafReservePercent: number;
  incomeTaxReservePercent: number;
}): AccountingReservePlan {
  const emergencyFundTarget = calculateEmergencyFundTarget(params.essentials, params.emergencyFundMonths);
  const emergencyGap = Math.max(0, emergencyFundTarget - Math.max(0, params.currentReserves));
  const emergencyFundCatchUp = roundMoney(emergencyGap / Math.max(1, params.emergencyFundMonths));
  const urssafReserve = roundMoney(Math.max(0, params.projectedIncome) * Math.max(0, params.urssafReservePercent) / 100);
  const incomeTaxReserve = roundMoney(Math.max(0, params.projectedIncome) * Math.max(0, params.incomeTaxReservePercent) / 100);
  const totalReserveAmount = roundMoney(
    Math.max(0, params.expensesThisMonth) +
      Math.max(0, params.nextThreeMonthsExpenses) +
      emergencyFundCatchUp +
      urssafReserve +
      incomeTaxReserve +
      Math.max(0, params.essentials) +
      Math.max(0, params.wants) +
      Math.max(0, params.savingsGoalMonthly)
  );

  return {
    projectedIncome: roundMoney(Math.max(0, params.projectedIncome)),
    expensesThisMonth: roundMoney(Math.max(0, params.expensesThisMonth)),
    nextThreeMonthsExpenses: roundMoney(Math.max(0, params.nextThreeMonthsExpenses)),
    emergencyFundTarget,
    emergencyFundCatchUp,
    urssafReserve,
    incomeTaxReserve,
    totalReserveAmount,
    safeToSpend: roundMoney(Math.max(0, params.projectedIncome - totalReserveAmount))
  };
}

export function buildAccountingAdvice(params: {
  projectedIncome: number;
  essentialExpenses: number;
  monthlyWants: number;
  savingsGoalMonthly: number;
  currentReserves: number;
  emergencyFundMonths: number;
  expensesThisMonth: number;
  nextThreeMonthsExpenses: number;
  urssafReservePercent: number;
  incomeTaxReservePercent: number;
  profilePreset: "FRENCH_FREELANCER" | "LEBANESE_COMPANY";
  monthlyLifestyleTarget: number;
}): AccountingAdvice[] {
  const accountingPlan = calculateAccountingPlan({
    projectedIncome: params.projectedIncome,
    essentials: params.essentialExpenses,
    wants: params.monthlyWants,
    savingsGoalMonthly: params.savingsGoalMonthly,
    currentReserves: params.currentReserves,
    emergencyFundMonths: params.emergencyFundMonths,
    expensesThisMonth: params.expensesThisMonth,
    nextThreeMonthsExpenses: params.nextThreeMonthsExpenses,
    urssafReservePercent: params.urssafReservePercent,
    incomeTaxReservePercent: params.incomeTaxReservePercent
  });

  const advice: AccountingAdvice[] = [
    {
      title: "Monthly obligations",
      message: `You have ${roundMoney(params.expensesThisMonth).toFixed(2)} of planned expenses this month and ${roundMoney(params.nextThreeMonthsExpenses).toFixed(2)} scheduled over the next 3 months.`
    }
  ];

  if (params.profilePreset === "FRENCH_FREELANCER") {
    advice.push({
      title: "French reserves",
      message: `Set aside about ${accountingPlan.urssafReserve.toFixed(2)} for URSSAF and ${accountingPlan.incomeTaxReserve.toFixed(2)} for income tax on this month's projected turnover.`
    });
  }

  advice.push({
    title: "Emergency fund",
    message:
      accountingPlan.emergencyFundCatchUp > 0
        ? `To close your emergency-fund gap over ${params.emergencyFundMonths} months, reserve about ${accountingPlan.emergencyFundCatchUp.toFixed(2)} this month.`
        : "Your emergency fund is already at target."
  });

  const spendableAfterTarget = accountingPlan.safeToSpend - Math.max(0, params.monthlyLifestyleTarget);
  advice.push({
    title: "Spending guidance",
    message:
      spendableAfterTarget >= 0
        ? `After taxes, expenses, and reserve top-ups, you can spend about ${spendableAfterTarget.toFixed(2)} on discretionary items while staying on track.`
        : `Your projected income is short by ${Math.abs(spendableAfterTarget).toFixed(2)} after taxes, expenses, and reserve top-ups, so reduce discretionary spending or increase billable days.`
  });

  return advice;
}

export function calculateInvoiceLineTotals(
  lines: Array<Pick<InvoiceLineDraft, "quantityDays" | "unitPrice">>
): number {
  return roundMoney(
    lines.reduce((sum, line) => sum + Math.max(0, line.quantityDays) * Math.max(0, line.unitPrice), 0)
  );
}

export function calculateInvoiceTotals(params: {
  lines: Array<Pick<InvoiceLineDraft, "quantityDays" | "unitPrice">>;
  vatRate: number;
  vatApplicable: boolean;
}): InvoiceTotals {
  const subtotal = calculateInvoiceLineTotals(params.lines);
  const vatAmount = params.vatApplicable ? roundMoney(subtotal * (Math.max(0, params.vatRate) / 100)) : 0;

  return {
    subtotal,
    vatAmount,
    total: roundMoney(subtotal + vatAmount)
  };
}

export function buildInvoiceLineDrafts(lines: InvoiceLineDraft[]): InvoiceLineDraft[] {
  return lines.map((line) => ({
    description: line.description,
    quantityDays: Math.max(0, line.quantityDays),
    unitPrice: Math.max(0, line.unitPrice),
    total: roundMoney(Math.max(0, line.quantityDays) * Math.max(0, line.unitPrice))
  }));
}

export function buildAssistantRecommendations(params: {
  projectedIncome: number;
  essentialExpenses: number;
  currentReserves: number;
  emergencyFundTarget: number;
  runwayMonths: number;
  averageDailyRate: number;
  requiredMonthlyIncome: number;
  targetMonths?: number;
}): AssistantRecommendation[] {
  const recommendations: AssistantRecommendation[] = [];
  const targetMonths = params.targetMonths ?? 6;

  const runwayMessage =
    params.runwayMonths >= targetMonths
      ? `Your reserves cover about ${params.runwayMonths.toFixed(1)} months, so you are above the ${targetMonths}-month safety target.`
      : `Your reserves cover about ${params.runwayMonths.toFixed(1)} months, so you are below the ${targetMonths}-month safety target.`;

  recommendations.push({
    title: "Emergency fund",
    message: runwayMessage
  });

  const extraIncome = params.projectedIncome - params.requiredMonthlyIncome;
  if (extraIncome > 0 && params.averageDailyRate > 0) {
    const extraDaysOff = Math.floor(extraIncome / params.averageDailyRate);
    recommendations.push({
      title: "Time off",
      message: `With your current reserves and projected income, you can safely take ${extraDaysOff} extra days off next month while still staying close to your target.`
    });
  } else {
    recommendations.push({
      title: "Time off",
      message: "Your projected income is tight relative to your target, so keep your planned working days unless you reduce spending."
    });
  }

  const reserveGap = params.emergencyFundTarget - params.currentReserves;
  if (reserveGap > 0) {
    recommendations.push({
      title: "Reserve gap",
      message: `You still need ${reserveGap.toFixed(2)} in reserves to reach your emergency-fund target.`
    });
  } else {
    recommendations.push({
      title: "Reserve gap",
      message: "Your current reserves are at or above the emergency-fund target."
    });
  }

  return recommendations;
}

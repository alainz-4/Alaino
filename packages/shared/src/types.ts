export type VatMode = "applicable" | "exempt";

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";

export type WorkDayStatus = "WORKING" | "OFF";

export type ContractPaymentType = "DAILY" | "RETAINER" | "FIXED";

export interface BudgetSplit {
  needsPercent: number;
  wantsPercent: number;
  savingsPercent: number;
}

export interface FinanceSnapshot {
  essentialExpenses: number;
  wants: number;
  emergencyFundMonths: number;
  currentReserves: number;
  savingsGoalMonthly: number;
  budgetSplit: BudgetSplit;
}

export interface ExpenseRecord {
  title: string;
  category: string;
  amount: number;
  dueDate: string;
  recurrence: "ONE_TIME" | "MONTHLY";
  status: "PLANNED" | "PAID";
}

export interface ExpenseForecastMonth {
  month: string;
  planned: number;
  paid: number;
  total: number;
}

export interface AccountingReservePlan {
  projectedIncome: number;
  expensesThisMonth: number;
  nextThreeMonthsExpenses: number;
  emergencyFundTarget: number;
  emergencyFundCatchUp: number;
  urssafReserve: number;
  incomeTaxReserve: number;
  totalReserveAmount: number;
  safeToSpend: number;
}

export interface ExpenseAlert {
  kind: "OVERDUE" | "DUE_SOON" | "UPCOMING" | "RECURRING";
  severity: "info" | "warning" | "danger";
  title: string;
  message: string;
  dueDate: string;
  amount: number;
}

export interface MonthlyGoalPlan {
  projectedIncome: number;
  essentialExpenses: number;
  monthlyWants: number;
  savingsGoalMonthly: number;
  emergencyFundTarget: number;
  emergencyFundCatchUp: number;
  urssafReserve: number;
  incomeTaxReserve: number;
  monthlySavingsTarget: number;
  monthlyProtectedTotal: number;
  flexibleSpendingCap: number;
}

export interface CashflowScenario {
  label: string;
  message: string;
  projectedIncome: number;
  safeToSpend: number;
  remainingAfterGoals: number;
  incomeShockPercent: number;
  extraExpense: number;
  extraDaysOff: number;
  shortfall: number;
}

export interface AccountingAdvice {
  title: string;
  message: string;
}

export interface IncomeProjection {
  month: string;
  workingDaysIncome: number;
  retainerIncome: number;
  fixedProjectIncome: number;
  projectedIncome: number;
}

export interface BudgetRecommendation {
  needs: number;
  wants: number;
  savings: number;
}

export interface AssistantRecommendation {
  title: string;
  message: string;
}

export interface InvoiceLineDraft {
  description: string;
  quantityDays: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceTotals {
  subtotal: number;
  vatAmount: number;
  total: number;
}

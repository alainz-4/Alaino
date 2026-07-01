export type ClientDTO = {
  id: string;
  name: string;
  legalName?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  postalCode: string;
  city: string;
  country: string;
  vatNumber?: string | null;
  email?: string | null;
  contactName?: string | null;
  notes?: string | null;
};

export type ProfilePreset = "FRENCH_FREELANCER" | "LEBANESE_COMPANY";

export type ContractDTO = {
  id: string;
  clientId: string;
  title: string;
  paymentType: "DAILY" | "RETAINER" | "FIXED";
  startDate: string;
  endDate?: string | null;
  dailyRate?: number | null;
  monthlyRetainerAmount?: number | null;
  fixedProjectAmount?: number | null;
  fixedProjectDate?: string | null;
  billingDayOfMonth?: number | null;
  active: boolean;
  notes?: string | null;
  client: ClientDTO;
};

export type WorkDayDTO = {
  id: string;
  workDate: string;
  status: "WORKING" | "OFF";
  contractId?: string | null;
  clientId?: string | null;
  dailyRate?: number | null;
  notes?: string | null;
  contract?: { id: string; title: string } | null;
  client?: { id: string; name: string } | null;
};

export type WorkDayUpdatePayload = {
  status: "WORKING" | "OFF";
  contractId?: string | null;
  clientId?: string | null;
  dailyRate?: number | null;
  notes?: string | null;
};

export type ExpenseDTO = {
  id: string;
  title: string;
  category: string;
  amount: number;
  dueDate: string;
  recurrence: "ONE_TIME" | "MONTHLY";
  status: "PLANNED" | "PAID";
  notes?: string | null;
};

export type ExpenseSummaryResponse = {
  month: string;
  horizonMonths: number;
  currentMonth: {
    month: string;
    planned: number;
    paid: number;
    total: number;
  };
  forecast: Array<{
    month: string;
    planned: number;
    paid: number;
    total: number;
  }>;
  expenses: ExpenseDTO[];
  alerts: Array<{
    kind: "OVERDUE" | "DUE_SOON" | "UPCOMING" | "RECURRING";
    severity: "info" | "warning" | "danger";
    title: string;
    message: string;
    dueDate: string;
    amount: number;
  }>;
  totals: {
    planned: number;
    paid: number;
    total: number;
  };
  monthlyGoalPlan: {
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
  };
  nextMonths: Array<{
    month: string;
    planned: number;
    paid: number;
    total: number;
  }>;
};

export type PlanningResponse = {
  goalPlan: {
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
  };
  scenarios: Array<{
    label: string;
    message: string;
    projectedIncome: number;
    safeToSpend: number;
    remainingAfterGoals: number;
    incomeShockPercent: number;
    extraExpense: number;
    extraDaysOff: number;
    shortfall: number;
  }>;
};

export type InvoiceLineDTO = {
  id: string;
  description: string;
  quantityDays: number;
  unitPrice: number;
  total: number;
  sortOrder: number;
};

export type InvoiceDTO = {
  id: string;
  invoiceSeries: string;
  invoiceNumber: string;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
  issueDate: string;
  servicePeriodStart: string;
  servicePeriodEnd: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency: string;
  paymentTermsDays: number;
  latePaymentRate: number;
  recoveryChargeAmount: number;
  vatMode: "APPLICABLE" | "EXEMPT";
  vatExemptionMention?: string | null;
  notes?: string | null;
  client: ClientDTO;
  contract?: ContractDTO | null;
  lines: InvoiceLineDTO[];
};

export type PaymentLogDTO = {
  id: string;
  userProfileId: string;
  invoiceId?: string | null;
  clientId?: string | null;
  kind: "INVOICE_PAYMENT" | "CLIENT_DEPOSIT" | "OTHER";
  title: string;
  amount: number;
  currency: string;
  receivedAt: string;
  method?: string | null;
  notes?: string | null;
  client?: { id: string; name: string } | null;
  invoice?: { id: string; invoiceNumber: string; total: number; status: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type DashboardSummary = {
  month: string;
  projectedIncome: number;
  workingDaysIncome: number;
  retainerIncome: number;
  fixedProjectIncome: number;
  invoiceTotals: {
    all: number;
    byStatus: Record<string, number>;
  };
  receivedThisMonth: number;
  recentPayments: PaymentLogDTO[];
  reserves: number;
  runwayMonths: number;
  emergencyFundTarget: number;
  budgetRecommendation: {
    needs: number;
    wants: number;
    savings: number;
  };
  expenseSummary: {
    currentMonth: {
      month: string;
      planned: number;
      paid: number;
      total: number;
    };
    nextThreeMonths: Array<{
      month: string;
      planned: number;
      paid: number;
      total: number;
    }>;
    totalPlannedThisMonth: number;
    totalPlannedNextThreeMonths: number;
    nextThreeMonthsExpenses: number;
    urssafReserve: number;
    incomeTaxReserve: number;
    emergencyFundCatchUp: number;
    safeToSpend: number;
  };
  monthlyGoalPlan: {
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
  };
  requiredMonthlyIncome: number;
  assistantRecommendations: Array<{ title: string; message: string }>;
  workingDaysCount: number;
  offDaysCount: number;
  recommendedDailyRate: number;
};

export type CalendarResponse = {
  month: string;
  days: WorkDayDTO[];
  projection: DashboardSummary;
};

export type BootstrapResponse = {
  profile: {
    id: string;
    profilePreset: ProfilePreset;
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
  freelanceSettings: {
    id: string;
    defaultDailyRate: number;
    standardWorkingDays: number;
    timezone: string;
    defaultCurrency: string;
  };
  financeSettings: {
    id: string;
    monthlyEssentialExpenses: number;
    monthlyWants: number;
    emergencyFundMonths: number;
    currentReserves: number;
    savingsGoalMonthly: number;
    needsPercent: number;
    wantsPercent: number;
    savingsPercent: number;
    monthlyLifestyleTarget: number;
    urssafReservePercent: number;
    incomeTaxReservePercent: number;
  };
  invoiceSettings: {
    id: string;
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
};

export type GoogleDriveStatus = {
  clientId: string | null;
  clientIdConfigured: boolean;
  clientSecretConfigured: boolean;
  refreshTokenConfigured: boolean;
  folderId: string | null;
  connectedEmail: string | null;
  connectedAt: string | null;
  oauthConfigured: boolean;
  redirectUri: string;
};

export type AssistantChatMessage = {
  role: "user" | "assistant";
  content: string;
  actionPlan?: string[] | null;
  usedAi?: boolean;
  createdAt?: string;
};

export type AssistantChatResponse = {
  reply: string;
  usedAi: boolean;
  actionPlan: string[];
  conversationId: string;
};

export type AssistantConversationSummary = {
  id: string;
  title: string;
  isPinned: boolean;
  isArchived: boolean;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

export type AssistantHistoryResponse = {
  conversationId: string;
  memorySummary: string | null;
  conversations: AssistantConversationSummary[];
  messages: AssistantChatMessage[];
};

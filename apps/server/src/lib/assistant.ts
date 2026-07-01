import { prisma } from "./prisma.js";
import { env } from "../env.js";
import { buildDashboardSummary } from "./dashboard.js";
import { ensureWorkspaceState } from "./workspace.js";
import { serializeClient, serializeContract, serializeInvoice } from "./serializers.js";
import { toNumber } from "./number.js";
import { format } from "date-fns";
import { generateLocalAssistantText } from "./local-assistant.js";

export type ChatMessage = {
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
};

export type AssistantHistoryResponse = {
  conversationId: string;
  memorySummary: string | null;
  conversations: AssistantConversationSummary[];
  messages: ChatMessage[];
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

type AssistantDigest = {
  workspace: string[];
  invoices: string[];
  clients: string[];
  contracts: string[];
  payments: string[];
};

type OpenAiMessage = {
  role: "developer" | "user" | "assistant";
  content: string;
};

function summarizeDashboard(summary: Awaited<ReturnType<typeof buildDashboardSummary>>) {
  return [
    `Month: ${summary.month}`,
    `Projected income: ${summary.projectedIncome}`,
    `Working day income: ${summary.workingDaysIncome}`,
    `Retainers: ${summary.retainerIncome}`,
    `Fixed projects: ${summary.fixedProjectIncome}`,
    `Emergency fund target: ${summary.emergencyFundTarget}`,
    `Current reserves: ${summary.reserves}`,
    `Runway months: ${summary.runwayMonths}`,
    `Safe to spend: ${summary.expenseSummary.safeToSpend}`,
    `URSSAF reserve: ${summary.expenseSummary.urssafReserve}`,
    `Income tax reserve: ${summary.expenseSummary.incomeTaxReserve}`,
    `Emergency top-up: ${summary.expenseSummary.emergencyFundCatchUp}`,
    `Monthly goals: essentials ${summary.monthlyGoalPlan.essentialExpenses}, wants ${summary.monthlyGoalPlan.monthlyWants}, savings ${summary.monthlyGoalPlan.monthlySavingsTarget}`
  ].join("\n");
}

function summarizeLocalFacts(
  summary: Awaited<ReturnType<typeof buildDashboardSummary>>,
  profilePreset: "FRENCH_FREELANCER" | "LEBANESE_COMPANY"
) {
  return [
    `Projected income: ${money(summary.projectedIncome)}`,
    `Safe to spend: ${money(summary.expenseSummary.safeToSpend)}`,
    `Current reserves: ${money(summary.reserves)}`,
    `Runway months: ${summary.runwayMonths.toFixed(1)}`,
    `Emergency target: ${money(summary.emergencyFundTarget)}`,
    `Emergency top-up needed: ${money(summary.expenseSummary.emergencyFundCatchUp)}`,
    profilePreset === "FRENCH_FREELANCER"
      ? `French reserves: URSSAF ${money(summary.expenseSummary.urssafReserve)} and income tax ${money(summary.expenseSummary.incomeTaxReserve)}`
      : "Lebanon profile: keep local tax reserve fields configurable in Settings",
    `Monthly plan: needs ${money(summary.monthlyGoalPlan.essentialExpenses)}, wants ${money(summary.monthlyGoalPlan.monthlyWants)}, savings ${money(summary.monthlyGoalPlan.monthlySavingsTarget)}`
  ].join("; ");
}

function money(value: number) {
  return toNumber(value).toFixed(2);
}

function buildLocalReply(
  summary: Awaited<ReturnType<typeof buildDashboardSummary>>,
  userMessage: string,
  digest: AssistantDigest,
  profilePreset: "FRENCH_FREELANCER" | "LEBANESE_COMPANY"
) {
  const lower = userMessage.toLowerCase();
  const intent = detectIntent(lower);
  const safe = summary.expenseSummary.safeToSpend;
  const overdueInvoices = digest.invoices.filter((line) => line.includes("OVERDUE"));
  const topInvoice = digest.invoices[0];
  const intro = pick(
    [
      `I'm looking at projected income of ${money(summary.projectedIncome)} and a safe-to-spend ceiling of ${money(safe)}.`,
      `Based on the current month, you have ${money(summary.projectedIncome)} projected income and ${money(safe)} left after reserves.`,
      `Your numbers point to ${money(summary.projectedIncome)} projected income, with ${money(safe)} available after the basics.`
    ],
    lower
  );

  if (intent === "invoice") {
    const invoiceHint = topInvoice ? `Your latest invoice context is ${topInvoice}.` : "You do not have any invoices yet.";
    const contractHint = digest.contracts[0] ? `Your main contract context is ${digest.contracts[0]}.` : "No active contracts are recorded yet.";
    const clientHint = digest.clients[0] ? `Your first client on file is ${digest.clients[0]}.` : "No clients are recorded yet.";
    return `${intro} ${invoiceHint} ${contractHint} ${clientHint} Use those records to decide whether to invoice, follow up, or schedule more work.`;
  }

  if (intent === "timeOff") {
    return `${intro} Based on the current reserve buffer, you can keep about ${money(safe)} protected for the month. If you want time off, protect the tax reserve and emergency-fund top-up first, then see what remains as flexible spending.`;
  }

  if (intent === "expense" || intent === "spending") {
    const reserveLine =
      profilePreset === "FRENCH_FREELANCER"
        ? `after setting aside ${money(summary.expenseSummary.urssafReserve)} for URSSAF, ${money(summary.expenseSummary.incomeTaxReserve)} for tax, and ${money(summary.expenseSummary.emergencyFundCatchUp)} for the emergency fund`
        : `after setting aside ${money(summary.expenseSummary.emergencyFundCatchUp)} for the emergency fund and any local taxes you have configured`;
    return `${intro} I would treat ${money(safe)} as the ceiling ${reserveLine}.`;
  }

  if (intent === "reserve" || intent === "tax") {
    const localTaxNote =
      profilePreset === "FRENCH_FREELANCER"
        ? `In French profile mode, that means ${money(summary.expenseSummary.urssafReserve)} for URSSAF and ${money(summary.expenseSummary.incomeTaxReserve)} for income tax.`
        : `In Lebanese profile mode, keep the local tax reserve fields configurable and tied to your own setup.`;
    return `${intro} Your emergency fund target is ${money(summary.emergencyFundTarget)} and your current runway is ${summary.runwayMonths.toFixed(1)} months. Add ${money(summary.expenseSummary.emergencyFundCatchUp)} this month to stay on track. ${localTaxNote}`;
  }

  if (intent === "payment") {
    const latestPayment = digest.payments[0];
    const paymentHint = latestPayment ? `The latest logged payment is ${latestPayment}.` : "There are no logged payments yet.";
    return `${intro} ${paymentHint} If you're expecting money, log it as soon as it lands so the cashflow numbers stay honest.`;
  }

  if (
    containsAny(lower, ["what should i do", "what do i do", "do this month", "plan my month", "next steps", "recommend", "guide me"])
  ) {
    const topRecommendations = summary.assistantRecommendations.slice(0, 2).map((item) => item.message);
    const paymentHint = digest.payments[0] ? `Your latest payment context is ${digest.payments[0]}.` : "No payments are logged yet.";
    return [
      `${intro}`,
      summary.expenseSummary.emergencyFundCatchUp > 0
        ? `First, reserve ${money(summary.expenseSummary.emergencyFundCatchUp)} for the emergency fund and protect the tax reserve before discretionary spending.`
        : `Your emergency fund is already on target, so you can focus on taxes, invoices, and planned spending.`,
      frenchProfileLine(profilePreset, summary),
      paymentHint,
      topRecommendations[0] ? `Also: ${topRecommendations[0]}` : null,
      topRecommendations[1] ? `And: ${topRecommendations[1]}` : null
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (overdueInvoices.length > 0) {
    const reserveLine =
      profilePreset === "FRENCH_FREELANCER"
        ? `reserve ${money(summary.expenseSummary.urssafReserve)} for URSSAF, ${money(summary.expenseSummary.incomeTaxReserve)} for tax, and leave the rest inside your safe-to-spend cap of ${money(safe)}`
        : `leave the rest inside your safe-to-spend cap of ${money(safe)} after local tax planning`;
    return `${intro} You have overdue invoices in the workspace. I would prioritize collections first, then ${reserveLine}.`;
  }

  return `${intro} Ask me about expenses, reserves, tax set-asides, invoices, payments received, clients, contracts, or whether you can afford extra time off.`;
}

function buildMemoryHeuristic(currentMemory: string | null, userMessage: string, assistantReply: string) {
  const lines = new Set(
    (currentMemory ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  );
  const combined = `${userMessage}\n${assistantReply}`.toLowerCase();

  if (containsAny(combined, ["dd/mm/yyyy", "date format"])) {
    lines.add("Use dd/mm/yyyy date formatting.");
  }

  if (containsAny(combined, ["french company", "french freelancer", "lebanese company"])) {
    lines.add("Support both French freelancer and Lebanese company profiles.");
  }

  if (containsAny(combined, ["ai accountant", "actual ai", "smart", "accurate"])) {
    lines.add("The assistant should answer like a precise AI accountant, not a generic chatbot.");
  }

  if (containsAny(combined, ["conversation", "history", "threads"])) {
    lines.add("Keep conversations organized in history and preserve recent context.");
  }

  if (containsAny(combined, ["payment received", "got paid", "receive payment"])) {
    lines.add("Track received payments explicitly so cashflow stays accurate.");
  }

  return [...lines].slice(0, 8).join("\n").trim();
}

function buildActionPlan(
  summary: Awaited<ReturnType<typeof buildDashboardSummary>>,
  userMessage: string,
  digest: AssistantDigest,
  profilePreset: "FRENCH_FREELANCER" | "LEBANESE_COMPANY"
): string[] {
  const actions: string[] = [];
  const lower = userMessage.toLowerCase();
  const frenchProfile = profilePreset === "FRENCH_FREELANCER";
  const intent = detectIntent(lower);

  if (summary.expenseSummary.emergencyFundCatchUp > 0) {
    actions.push(`Reserve ${money(summary.expenseSummary.emergencyFundCatchUp)} for the emergency fund this month.`);
  }

  if (frenchProfile) {
    actions.push(`Set aside ${money(summary.expenseSummary.urssafReserve)} for URSSAF and ${money(summary.expenseSummary.incomeTaxReserve)} for income tax.`);
  }

  const overdueInvoices = digest.invoices.filter((line) => line.includes("OVERDUE"));
  if (overdueInvoices.length > 0) {
    actions.push(`Follow up on overdue invoices first: ${overdueInvoices.slice(0, 2).join(" | ")}.`);
  }

  if (summary.expenseSummary.currentMonth.total > 0) {
    actions.push(`Keep current month expenses within ${money(summary.expenseSummary.safeToSpend)} of safe-to-spend room after reserves.`);
  }

  if (intent === "timeOff") {
    const timeOff = summary.assistantRecommendations.find((item) => item.title === "Time off");
    actions.push(timeOff?.message ?? "Reduce billable days only if the reserve targets stay covered.");
  }

  if (intent === "payment") {
    actions.push("Log every received payment with the date, amount, and linked invoice so cashflow stays accurate.");
  }

  if (intent === "invoice") {
    actions.push("Open the invoice details panel to verify the issue date, service period, and payment terms before sending.");
  }

  const planFromRecommendations = summary.assistantRecommendations
    .filter((item) => item.title !== "Time off")
    .slice(0, 2)
    .map((item) => item.message);
  actions.push(...planFromRecommendations);

  if (digest.clients[0]) {
    actions.push(`Use your client list to chase the next invoice or scope the next project: ${digest.clients[0]}.`);
  }

  return [...new Set(actions)].slice(0, 4);
}

function detectIntent(lower: string): "invoice" | "timeOff" | "spending" | "reserve" | "tax" | "payment" | "expense" | "general" {
  if (containsAny(lower, ["invoice", "client", "contract", "quote", "bill", "payment terms", "due date"])) {
    return "invoice";
  }
  if (containsAny(lower, ["time off", "days off", "holiday", "vacation", "rest", "break"])) {
    return "timeOff";
  }
  if (containsAny(lower, ["spend", "budget", "safe to spend", "cashflow", "runway"])) {
    return "spending";
  }
  if (containsAny(lower, ["reserve", "emergency", "buffer", "runway months"])) {
    return "reserve";
  }
  if (containsAny(lower, ["tax", "urssaf", "vat", "tva", "social charge", "income tax"])) {
    return "tax";
  }
  if (containsAny(lower, ["payment received", "got paid", "paid", "received", "bank transfer", "money landed"])) {
    return "payment";
  }
  if (containsAny(lower, ["expense", "bill", "cost", "subscription", "fee"])) {
    return "expense";
  }
  return "general";
}

function containsAny(input: string, terms: string[]) {
  return terms.some((term) => input.includes(term));
}

function frenchProfileLine(
  profilePreset: "FRENCH_FREELANCER" | "LEBANESE_COMPANY",
  summary: Awaited<ReturnType<typeof buildDashboardSummary>>
) {
  if (profilePreset === "FRENCH_FREELANCER") {
    return `Keep ${money(summary.expenseSummary.urssafReserve)} aside for URSSAF and ${money(summary.expenseSummary.incomeTaxReserve)} for income tax.`;
  }

  return "Keep your Lebanon-specific tax and reserve fields configurable in Settings so the plan matches your company profile.";
}

function pick(options: string[], seed: string) {
  return options[hash(seed) % options.length];
}

function hash(input: string) {
  let value = 0;
  for (let index = 0; index < input.length; index += 1) {
    value = (value * 31 + input.charCodeAt(index)) >>> 0;
  }
  return value;
}

function extractResponseText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const candidate = payload as {
    output_text?: string;
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  if (typeof candidate.output_text === "string" && candidate.output_text.trim()) {
    return candidate.output_text.trim();
  }

  const message = candidate.output?.find((item) => item.type === "message");
  const text = message?.content?.map((item) => item.text ?? "").join("").trim() ?? "";
  return text;
}

async function loadDigest() {
  const [clients, contracts, invoices, payments] = await Promise.all([
    prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    prisma.contract.findMany({
      where: { active: true },
      include: { client: true },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    prisma.invoice.findMany({
      include: { client: true, lines: { orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    prisma.paymentLog.findMany({
      include: { client: true, invoice: true },
      orderBy: { receivedAt: "desc" },
      take: 6
    })
  ]);

  const clientLines = clients.map((client) => {
    const serialized = serializeClient(client);
    return [
      serialized.name,
      serialized.country,
      serialized.vatNumber ? `VAT ${serialized.vatNumber}` : null
    ]
      .filter(Boolean)
      .join(" | ");
  });

  const contractLines = contracts.map((contract) => {
    const serialized = serializeContract(contract);
    return [
      serialized.title,
      contract.client.name,
      serialized.paymentType,
      serialized.dailyRate !== null ? `daily ${money(serialized.dailyRate)}` : null,
      serialized.monthlyRetainerAmount !== null ? `retainer ${money(serialized.monthlyRetainerAmount)}` : null,
      serialized.fixedProjectAmount !== null ? `fixed ${money(serialized.fixedProjectAmount)}` : null
    ]
      .filter(Boolean)
      .join(" | ");
  });

  const invoiceLines = invoices.map((invoice) => {
    const serialized = serializeInvoice(invoice);
    const lineSummary = invoice.lines.slice(0, 2).map((line) => line.description).filter(Boolean).join("; ");
    return [
      serialized.invoiceNumber,
      invoice.client.name,
      serialized.status,
      money(serialized.total),
      `due ${formatDate(serialized.dueDate ?? serialized.issueDate)}`,
      lineSummary ? `lines: ${lineSummary}` : null
    ]
      .filter(Boolean)
      .join(" | ");
  });

  const paymentLines = payments.map((payment) => {
    const amount = money(Number(payment.amount));
    return [
      payment.title,
      amount,
      formatDate(payment.receivedAt),
      payment.client?.name ?? null,
      payment.invoice?.invoiceNumber ?? null,
      payment.method ?? null
    ]
      .filter(Boolean)
      .join(" | ");
  });

  return {
    clients: clientLines,
    contracts: contractLines,
    invoices: invoiceLines,
    payments: paymentLines,
    workspace: [
      `Workspace profile: ${clients.length} clients, ${contracts.length} active contracts, ${invoices.length} recent invoices, ${payments.length} recent payments.`,
      `Latest client names: ${clientLines.slice(0, 3).join(" || ") || "none"}`,
      `Latest contract names: ${contractLines.slice(0, 3).join(" || ") || "none"}`,
      `Latest invoice names: ${invoiceLines.slice(0, 3).join(" || ") || "none"}`,
      `Latest payment names: ${paymentLines.slice(0, 3).join(" || ") || "none"}`
    ]
  };
}

function formatConversationTitle(input: string) {
  const cleaned = input.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "New conversation";
  }

  const title = cleaned.split(" ").slice(0, 5).join(" ");
  return title.length > 42 ? `${title.slice(0, 39).trimEnd()}…` : title;
}

async function listAssistantConversations(profileId: string): Promise<AssistantConversationSummary[]> {
  const conversations = await prisma.assistantConversation.findMany({
    where: { userProfileId: profileId },
    orderBy: [{ isPinned: "desc" }, { lastMessageAt: "desc" }, { updatedAt: "desc" }],
    include: {
      _count: {
        select: {
          messages: true
        }
      }
    }
  });

  return conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    isPinned: conversation.isPinned,
    isArchived: conversation.isArchived,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    messageCount: conversation._count.messages
  }));
}

async function pruneAssistantConversations(profileId: string, keep = 30, preserveConversationId?: string | null) {
  const total = await prisma.assistantConversation.count({
    where: { userProfileId: profileId }
  });

  if (total <= keep) {
    return;
  }

  const conversationsToDelete = await prisma.assistantConversation.findMany({
    where: {
      userProfileId: profileId,
      ...(preserveConversationId ? { id: { not: preserveConversationId } } : {})
    },
    orderBy: [{ lastMessageAt: "asc" }, { updatedAt: "asc" }, { createdAt: "asc" }],
    select: { id: true },
    take: total - keep
  });

  if (conversationsToDelete.length === 0) {
    return;
  }

  await prisma.assistantConversation.deleteMany({
    where: {
      id: {
        in: conversationsToDelete.map((conversation) => conversation.id)
      }
    }
  });
}

async function resolveAssistantConversation(profileId: string, conversationId?: string | null) {
  if (conversationId) {
    const found = await prisma.assistantConversation.findFirst({
      where: {
        id: conversationId,
        userProfileId: profileId
      }
    });

    if (found) {
      return found;
    }
  }

  const latest = await prisma.assistantConversation.findFirst({
    where: {
      userProfileId: profileId,
      isArchived: false
    },
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }]
  });

  if (latest) {
    return latest;
  }

  const created = await prisma.assistantConversation.create({
    data: {
      userProfileId: profileId,
      title: "New conversation"
    }
  });

  await pruneAssistantConversations(profileId, 30, created.id);
  return created;
}

async function getAssistantConversationOrThrow(profileId: string, conversationId: string) {
  const conversation = await prisma.assistantConversation.findFirst({
    where: {
      id: conversationId,
      userProfileId: profileId
    }
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  return conversation;
}

export async function createAssistantConversation(title?: string): Promise<AssistantConversationSummary> {
  const state = await ensureWorkspaceState();
  const conversation = await prisma.assistantConversation.create({
    data: {
      userProfileId: state.profile.id,
      title: title?.trim() || "New conversation"
    }
  });

  await pruneAssistantConversations(state.profile.id, 30, conversation.id);

  return {
    id: conversation.id,
    title: conversation.title,
    isPinned: conversation.isPinned,
    isArchived: conversation.isArchived,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    messageCount: 0
  };
}

export async function updateAssistantConversation(params: {
  conversationId: string;
  title?: string;
  isPinned?: boolean;
}) {
  const state = await ensureWorkspaceState();
  const conversation = await getAssistantConversationOrThrow(state.profile.id, params.conversationId);
  await prisma.assistantConversation.update({
    where: { id: conversation.id },
    data: {
      ...(typeof params.title === "string" ? { title: params.title.trim().slice(0, 80) || "New conversation" } : {}),
      ...(typeof params.isPinned === "boolean" ? { isPinned: params.isPinned } : {})
    }
  });
}

export async function deleteAssistantConversation(conversationId: string) {
  const state = await ensureWorkspaceState();
  const deleted = await prisma.assistantConversation.deleteMany({
    where: {
      id: conversationId,
      userProfileId: state.profile.id
    }
  });

  if (deleted.count === 0) {
    throw new Error("Conversation not found");
  }
}

function formatDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(`${value.slice(0, 10)}T12:00:00.000Z`) : value;
  return format(date, "dd/MM/yyyy");
}

async function callOpenAi(
  messages: ChatMessage[],
  summaryText: string,
  digest: AssistantDigest,
  conversationMemory?: string | null
): Promise<string | null> {
  const input: OpenAiMessage[] = [
    {
      role: "developer",
      content:
        "You are ALAINO freelance, an AI accountant for a freelancer in France or Lebanon. Be concise, practical, and numerical. Use the dashboard data, invoices, clients, contracts, expenses, payments, settings, and memory as the source of truth. Never invent numbers. If a figure is missing, say so plainly and explain what is needed. When asked what to do this month, answer with actionable accounting priorities and simple next steps. Prefer exact arithmetic and short explanations."
    },
    {
      role: "developer",
      content: `Current financial context:\n${summaryText}`
    },
    {
      role: "developer",
      content: `Workspace context:\n${digest.workspace.join("\n")}\n\nInvoices:\n${digest.invoices.join("\n")}\n\nClients:\n${digest.clients.join("\n")}\n\nContracts:\n${digest.contracts.join("\n")}`
    }
  ];

  if (conversationMemory?.trim()) {
    input.push({
      role: "developer",
      content: `Conversation memory:\n${conversationMemory.trim()}`
    });
  }

  input.push(
    ...messages.map((message) => ({
      role: message.role,
      content: message.content
    }))
  );

  return callOpenAiText(input);
}

async function callOpenAiText(messages: OpenAiMessage[]): Promise<string | null> {
  if (!env.openAiApiKey) {
    return null;
  }

  const response = await fetch(`${env.openAiBaseUrl.replace(/\/$/, "")}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openAiApiKey}`
    },
    body: JSON.stringify({
      model: env.openAiModel,
      store: false,
      input: messages
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(body || `OpenAI request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  const text = extractResponseText(payload);
  return text || null;
}

function buildLocalPrompt(
  messages: ChatMessage[],
  summaryText: string,
  profilePreset: "FRENCH_FREELANCER" | "LEBANESE_COMPANY",
  conversationMemory?: string | null
) {
  const userQuestion = messages[messages.length - 1]?.content ?? "";
  const memoryBlock = conversationMemory?.trim()
    ? `Persistent memory:\n${conversationMemory.trim()}\n`
    : "";

  return [
    "You are ALAINO freelance, an accountant assistant.",
    "Answer with exact numbers, simple language, and no invented facts.",
    "If the question is ambiguous, mention the missing input instead of guessing.",
    memoryBlock.trim(),
    `Question: ${userQuestion}`,
    `Facts: ${summaryText}`,
    `Profile: ${profilePreset}`,
    "Give the most useful short answer first, then add a second line only if needed."
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildMemoryPrompt(currentMemory: string | null, recentMessages: ChatMessage[], profilePreset: "FRENCH_FREELANCER" | "LEBANESE_COMPANY") {
  const transcript = recentMessages
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n");

  return [
    "You maintain the long-term memory for ALAINO freelance, a precise AI accountant.",
    "Update the memory using only durable facts, recurring preferences, and standing instructions.",
    "Keep it short: a maximum of 8 short bullet-like lines or sentences.",
    "Do not store transient monthly figures unless they are explicitly permanent goals.",
    "Return plain text only, with no markdown code fences.",
    `Profile mode: ${profilePreset}`,
    `Current memory:\n${currentMemory?.trim() || "(empty)"}`,
    `Recent conversation:\n${transcript}`,
    "If nothing new matters, return the current memory unchanged."
  ].join("\n\n");
}

async function updateConversationMemory(params: {
  currentMemory: string | null;
  recentMessages: ChatMessage[];
  userMessage: string;
  assistantReply: string;
  profilePreset: "FRENCH_FREELANCER" | "LEBANESE_COMPANY";
}) {
  const prompt = buildMemoryPrompt(params.currentMemory, params.recentMessages, params.profilePreset);

  try {
    const aiMemory = await callOpenAiText([
      {
        role: "developer",
        content: prompt
      }
    ]);

    if (aiMemory?.trim()) {
      return aiMemory.trim();
    }
  } catch (error) {
    console.error("AI memory update failed:", error);
  }

  try {
    const localMemory = await generateLocalAssistantText(prompt);
    if (localMemory.trim()) {
      return localMemory.trim();
    }
  } catch (error) {
    console.error("Local memory update failed:", error);
  }

  return buildMemoryHeuristic(params.currentMemory, params.userMessage, params.assistantReply) || params.currentMemory || null;
}

export async function getAssistantHistory(conversationId?: string | null): Promise<AssistantHistoryResponse> {
  const state = await ensureWorkspaceState();
  const conversation = await resolveAssistantConversation(state.profile.id, conversationId);
  await pruneAssistantConversations(state.profile.id, 30, conversation.id);
  const conversations = await listAssistantConversations(state.profile.id);
  const messages = await prisma.assistantMessage.findMany({
    where: { assistantConversationId: conversation.id },
    orderBy: { createdAt: "asc" }
  });

  return {
    conversationId: conversation.id,
    memorySummary: conversation.memorySummary ?? null,
    conversations,
    messages: messages.map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content,
      actionPlan: message.actionPlanJson ? (JSON.parse(message.actionPlanJson) as string[]) : null,
      usedAi: message.usedAi,
      createdAt: message.createdAt.toISOString()
    }))
  };
}

export async function generateAssistantReply(input: {
  month: string;
  message: string;
  history: ChatMessage[];
  conversationMemory?: string | null;
}): Promise<AssistantChatResponse> {
  const state = await ensureWorkspaceState();
  const summary = await buildDashboardSummary(input.month);
  const digest = await loadDigest();

  const recentMessages = input.history.slice(-12);
  const lastUserMessage = input.message;
  const fullPromptHistory = [...recentMessages, { role: "user" as const, content: lastUserMessage }];
  const profilePreset = state.profile.profilePreset === "LEBANESE_COMPANY" ? "LEBANESE_COMPANY" : "FRENCH_FREELANCER";
  const summaryText = summarizeLocalFacts(summary, profilePreset);
  const conversationMemory = input.conversationMemory?.trim() || null;

  try {
    const aiReply = await callOpenAi(fullPromptHistory, summaryText, digest, conversationMemory);
    if (aiReply) {
      return {
        reply: aiReply,
        usedAi: true,
        actionPlan: buildActionPlan(summary, lastUserMessage, digest, profilePreset)
      };
    }
  } catch (error) {
    console.error("AI assistant request failed:", error);
  }

  try {
    const localPrompt = buildLocalPrompt(fullPromptHistory, summaryText, profilePreset, conversationMemory);
    const localReply = await generateLocalAssistantText(localPrompt);
    if (localReply.trim()) {
      return {
        reply: localReply.trim(),
        usedAi: true,
        actionPlan: buildActionPlan(summary, lastUserMessage, digest, profilePreset)
      };
    }
  } catch (error) {
    console.error("Local assistant request failed:", error);
  }

  const localReply = buildLocalReply(summary, lastUserMessage, digest, profilePreset);
  const profileHint =
    profilePreset === "LEBANESE_COMPANY"
      ? "I am using the Lebanese company profile settings for local planning."
      : "I am using the French freelancer profile settings for URSSAF and tax planning.";

  return {
    reply: `${localReply} ${profileHint}`,
    usedAi: false,
    actionPlan: buildActionPlan(summary, lastUserMessage, digest, profilePreset)
  };
}

export async function saveAssistantTurn(params: {
  conversationId: string;
  month: string;
  userMessage: string;
  reply: AssistantChatResponse;
}) {
  const state = await ensureWorkspaceState();
  const conversation = await resolveAssistantConversation(state.profile.id, params.conversationId);
  await prisma.assistantMessage.create({
    data: {
      assistantConversationId: conversation.id,
      role: "user",
      content: params.userMessage
    }
  });

  await prisma.assistantMessage.create({
    data: {
      assistantConversationId: conversation.id,
      role: "assistant",
      content: params.reply.reply,
      actionPlanJson: JSON.stringify(params.reply.actionPlan),
      usedAi: params.reply.usedAi
    }
  });

  const titleCandidate = conversation.title === "Accounting assistant" || conversation.title === "New conversation";
  const recentMessages = await prisma.assistantMessage.findMany({
    where: { assistantConversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    take: 8
  });
  const memorySummary = await updateConversationMemory({
    currentMemory: conversation.memorySummary ?? null,
    recentMessages: [...recentMessages].reverse().map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content,
      actionPlan: message.actionPlanJson ? (JSON.parse(message.actionPlanJson) as string[]) : null,
      usedAi: message.usedAi
    })),
    userMessage: params.userMessage,
    assistantReply: params.reply.reply,
    profilePreset: state.profile.profilePreset === "LEBANESE_COMPANY" ? "LEBANESE_COMPANY" : "FRENCH_FREELANCER"
  });

  await prisma.assistantConversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      memorySummary,
      ...(titleCandidate ? { title: formatConversationTitle(params.userMessage) } : {})
    }
  });

  return conversation.id;
}

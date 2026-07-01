import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { currentMonthKey } from "../lib/dates";
import type { BootstrapResponse, CalendarResponse, ContractDTO, DashboardSummary, WorkDayUpdatePayload } from "../types";
import { formatMoney } from "../lib/format";
import { Button, Chip, Field, Panel, StatCard } from "../components/Common";
import CalendarMonthView from "../components/CalendarMonthView";
import AIAgentPanel from "../components/AIAgentPanel";
import AssistantActionPlanPanel from "../components/AssistantActionPlanPanel";

type Props = {
  bootstrap: BootstrapResponse | null;
};

export default function DashboardPage({ bootstrap }: Props) {
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [assistantConversationId, setAssistantConversationId] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem("alaino.assistantConversationId");
  });
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null);
  const [contracts, setContracts] = useState<ContractDTO[]>([]);
  const [assistantRefreshToken, setAssistantRefreshToken] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reload();
  }, [monthKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (assistantConversationId) {
      window.localStorage.setItem("alaino.assistantConversationId", assistantConversationId);
    } else {
      window.localStorage.removeItem("alaino.assistantConversationId");
    }
  }, [assistantConversationId]);

  async function reload() {
    setLoading(true);
    try {
      const [summaryData, calendarData, contractData] = await Promise.all([
        api.get<DashboardSummary>(`/api/dashboard/summary?month=${monthKey}`),
        api.get<CalendarResponse>(`/api/calendar/${monthKey}`),
        api.get<ContractDTO[]>("/api/contracts")
      ]);
      setSummary(summaryData);
      setCalendar(calendarData);
      setContracts(contractData);
    } finally {
      setLoading(false);
    }
  }

  async function saveDay(date: string, payload: WorkDayUpdatePayload) {
    await api.put(`/api/work-days/${date}`, payload);
    await reload();
  }

  async function saveDays(dates: string[], payload: WorkDayUpdatePayload) {
    await api.put("/api/work-days/bulk", { dates, ...payload });
    await reload();
  }

  return (
    <div className="page-stack">
      <header className="page-hero">
        <div>
          <div className="eyebrow">ALAINO freelance dashboard</div>
          <h1>Income, runway, and calendar in one place.</h1>
          <p>
            Project your month, keep an eye on reserves, and turn billable days into compliant invoices without leaving the dashboard.
          </p>
        </div>
        <div className="hero-actions">
          <Button variant="secondary" onClick={() => document.getElementById("ai-accountant")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            Ask AI
          </Button>
          <Field label="Selected month">
            <input type="month" value={monthKey} onChange={(event) => setMonthKey(event.target.value)} />
          </Field>
          <Button variant="secondary" onClick={() => reload()}>{loading ? "Refreshing..." : "Refresh"}</Button>
        </div>
      </header>

      <section className="kpi-grid">
        <StatCard label="Projected income" value={formatMoney(summary?.projectedIncome ?? 0)} hint="Working days + retainers + fixed payments" />
        <StatCard label="Cash received" value={formatMoney(summary?.receivedThisMonth ?? 0)} hint="Logged payments for the selected month" />
        <StatCard label="Current reserves" value={formatMoney(summary?.reserves ?? 0)} hint={`Runway: ${(summary?.runwayMonths ?? 0).toFixed(1)} months`} />
        <StatCard label="Emergency target" value={formatMoney(summary?.emergencyFundTarget ?? 0)} hint="Configurable 3-6 month safety target" />
      </section>

      <section className="status-row">
        <Chip tone="blue">Drafts: {formatMoney(summary?.invoiceTotals.byStatus.DRAFT ?? 0)}</Chip>
        <Chip tone="amber">Sent: {formatMoney(summary?.invoiceTotals.byStatus.SENT ?? 0)}</Chip>
        <Chip tone="green">Paid: {formatMoney(summary?.invoiceTotals.byStatus.PAID ?? 0)}</Chip>
        <Chip tone="red">Overdue: {formatMoney(summary?.invoiceTotals.byStatus.OVERDUE ?? 0)}</Chip>
      </section>

      <section className="dashboard-grid">
        <CalendarMonthView
          monthKey={monthKey}
          days={calendar?.days ?? []}
          contracts={contracts}
          onMonthChange={setMonthKey}
          onSaveDay={saveDay}
          onSaveDays={saveDays}
          compact
        />

        <div className="stack">
          <div id="ai-accountant">
            <AIAgentPanel
              monthKey={monthKey}
              conversationId={assistantConversationId}
              onConversationChange={setAssistantConversationId}
              onAssistantResponse={() => setAssistantRefreshToken((current) => current + 1)}
              showConversationPicker={false}
            />
          </div>

          <AssistantActionPlanPanel conversationId={assistantConversationId} refreshToken={assistantRefreshToken} />

          <Panel title="Today's focus" subtitle="The short version of what matters after reserves">
            <div className="assistant-list compact">
              {summary?.assistantRecommendations?.length ? (
                summary.assistantRecommendations.slice(0, 3).map((item) => (
                  <article key={item.title} className="assistant-card">
                    <div className="assistant-title">{item.title}</div>
                    <p className="assistant-message">{item.message}</p>
                  </article>
                ))
              ) : (
                <div className="empty-state">Add finance settings to generate guidance.</div>
              )}
            </div>
          </Panel>
        </div>
      </section>
    </div>
  );
}

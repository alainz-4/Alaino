import { useEffect, useState } from "react";
import { api, apiBaseUrl } from "../lib/api";
import { currentMonthKey } from "../lib/dates";
import { formatMoney } from "../lib/format";
import { emptyExpense } from "../lib/empty";
import type {
  BootstrapResponse,
  DashboardSummary,
  ExpenseDTO,
  ExpenseSummaryResponse,
  PlanningResponse
} from "../types";
import { Button, Chip, Field, Panel } from "../components/Common";
import { formatDisplayDate } from "../lib/dates";

type Props = {
  bootstrap: BootstrapResponse | null;
};

type PlanningInputs = {
  extraExpense: number;
  incomeShockPercent: number;
  extraDaysOff: number;
};

export default function ExpensesPage({ bootstrap }: Props) {
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [summary, setSummary] = useState<ExpenseSummaryResponse | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [planning, setPlanning] = useState<PlanningResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyExpense);
  const [saving, setSaving] = useState(false);
  const [planningInputs, setPlanningInputs] = useState<PlanningInputs>({
    extraExpense: 0,
    incomeShockPercent: 10,
    extraDaysOff: 2
  });

  useEffect(() => {
    reload();
  }, [monthKey]);

  useEffect(() => {
    if (!summary || !dashboard || !bootstrap) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/calculations/planning`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            projectedIncome: dashboard.projectedIncome,
            requiredMonthlyIncome: dashboard.requiredMonthlyIncome,
            dailyRate: dashboard.recommendedDailyRate,
            workingDays: dashboard.workingDaysCount,
            essentials: bootstrap.financeSettings.monthlyEssentialExpenses,
            wants: bootstrap.financeSettings.monthlyWants,
            savingsGoalMonthly: bootstrap.financeSettings.savingsGoalMonthly,
            currentReserves: bootstrap.financeSettings.currentReserves,
            emergencyFundMonths: bootstrap.financeSettings.emergencyFundMonths,
            expensesThisMonth: summary.currentMonth.total,
            nextThreeMonthsExpenses: summary.nextMonths.reduce((sum, item) => sum + item.total, 0),
            urssafReservePercent: bootstrap.financeSettings.urssafReservePercent,
            incomeTaxReservePercent: bootstrap.financeSettings.incomeTaxReservePercent,
            extraExpense: planningInputs.extraExpense,
            incomeShockPercent: planningInputs.incomeShockPercent,
            extraDaysOff: planningInputs.extraDaysOff
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error("Planning request failed");
        }

        const data = (await response.json()) as PlanningResponse;

        if (!controller.signal.aborted) {
          setPlanning(data);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
          setPlanning(null);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [summary, dashboard, bootstrap, planningInputs]);

  async function reload() {
    const [expenseData, dashboardData] = await Promise.all([
      api.get<ExpenseSummaryResponse>(`/api/expenses/summary?month=${monthKey}&horizon=3`),
      api.get<DashboardSummary>(`/api/dashboard/summary?month=${monthKey}`)
    ]);
    setSummary(expenseData);
    setDashboard(dashboardData);
  }

  function selectExpense(expense: ExpenseDTO) {
    setSelectedId(expense.id);
    setForm({
      title: expense.title,
      category: expense.category,
      amount: expense.amount,
      dueDate: expense.dueDate.slice(0, 10),
      recurrence: expense.recurrence,
      status: expense.status,
      notes: expense.notes ?? ""
    });
  }

  async function saveExpense() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        notes: form.notes || null
      };

      if (selectedId) {
        await api.put(`/api/expenses/${selectedId}`, payload);
      } else {
        await api.post("/api/expenses", payload);
      }

      setSelectedId(null);
      setForm(emptyExpense);
      await reload();
    } finally {
      setSaving(false);
    }
  }

  async function removeExpense(id: string) {
    await api.delete(`/api/expenses/${id}`);
    if (selectedId === id) {
      setSelectedId(null);
      setForm(emptyExpense);
    }
    await reload();
  }

  const isFrenchProfile = bootstrap?.profile.profilePreset !== "LEBANESE_COMPANY";
  const advice = dashboard
    ? [
        `Your reserve-safe spending room for this month is ${formatMoney(dashboard.expenseSummary.safeToSpend)} after planned expenses, reserve top-ups, and the next 3 months of commitments.`,
        isFrenchProfile
          ? `You should set aside about ${formatMoney(dashboard.expenseSummary.urssafReserve)} for URSSAF and ${formatMoney(dashboard.expenseSummary.incomeTaxReserve)} for income tax on the selected month's projected income.`
          : "Your Lebanese profile does not use the French URSSAF defaults; keep the reserve fields configurable in Settings for local tax planning.",
        dashboard.expenseSummary.emergencyFundCatchUp > 0
          ? `To stay on track with your emergency fund, reserve ${formatMoney(dashboard.expenseSummary.emergencyFundCatchUp)} this month.`
          : "Your emergency fund is already at the configured target.",
        `Your current planned expenses total ${formatMoney(dashboard.expenseSummary.totalPlannedThisMonth)} this month and ${formatMoney(dashboard.expenseSummary.totalPlannedNextThreeMonths)} over the next 3 months.`
      ]
    : [];

  const monthlyGoals = dashboard?.monthlyGoalPlan ?? summary?.monthlyGoalPlan ?? null;

  return (
    <div className="page-stack two-column">
      <Panel title="Expenses" subtitle="Track actual spending, recurring bills, and the money you need to keep aside">
        <div className="stack">
          <div className="status-row">
            <div className="chip blue">This month: {formatMoney(summary?.currentMonth.total ?? 0)}</div>
            <div className="chip amber">Planned: {formatMoney(summary?.totals.planned ?? 0)}</div>
            <div className="chip green">Paid: {formatMoney(summary?.totals.paid ?? 0)}</div>
            <div className="chip">{isFrenchProfile ? "French profile" : "Lebanese profile"}</div>
          </div>

          {dashboard ? (
            <div className="status-row">
              <div className="chip green">Safe to spend: {formatMoney(dashboard.expenseSummary.safeToSpend)}</div>
              <div className="chip amber">URSSAF: {formatMoney(dashboard.expenseSummary.urssafReserve)}</div>
              <div className="chip blue">Tax reserve: {formatMoney(dashboard.expenseSummary.incomeTaxReserve)}</div>
              <div className="chip">Emergency catch-up: {formatMoney(dashboard.expenseSummary.emergencyFundCatchUp)}</div>
            </div>
          ) : null}

          {summary?.alerts.length ? (
            <div className="assistant-list">
              {summary.alerts.map((alert) => (
                <article key={`${alert.kind}-${alert.title}-${alert.dueDate}`} className="assistant-card">
                  <div className="assistant-title">
                    <Chip tone={alert.severity === "danger" ? "red" : alert.severity === "warning" ? "amber" : "blue"}>
                      {alert.kind.replaceAll("_", " ").toLowerCase()}
                    </Chip>
                    <span style={{ marginLeft: 10 }}>{alert.title}</span>
                  </div>
                  <p className="assistant-message">{alert.message}</p>
                </article>
              ))}
            </div>
          ) : null}

          {monthlyGoals ? (
            <Panel title="Auto-generated monthly goals" subtitle="What to keep aside before discretionary spending">
              <div className="budget-bars">
                <div>
                  <div className="budget-label">Essentials</div>
                  <div className="budget-value">{formatMoney(monthlyGoals.essentialExpenses)}</div>
                </div>
                <div>
                  <div className="budget-label">Wants</div>
                  <div className="budget-value">{formatMoney(monthlyGoals.monthlyWants)}</div>
                </div>
                <div>
                  <div className="budget-label">Savings target</div>
                  <div className="budget-value">{formatMoney(monthlyGoals.monthlySavingsTarget)}</div>
                </div>
                <div>
                  <div className="budget-label">Tax reserve</div>
                  <div className="budget-value">{formatMoney(monthlyGoals.urssafReserve + monthlyGoals.incomeTaxReserve)}</div>
                </div>
                <div>
                  <div className="budget-label">Emergency top-up</div>
                  <div className="budget-value">{formatMoney(monthlyGoals.emergencyFundCatchUp)}</div>
                </div>
                <div>
                  <div className="budget-label">Flexible spending cap</div>
                  <div className="budget-value">{formatMoney(monthlyGoals.flexibleSpendingCap)}</div>
                </div>
              </div>
            </Panel>
          ) : null}

          <div className="stack">
            {summary?.forecast.map((item) => (
              <div key={item.month} className="assistant-card">
                <div className="assistant-title">{item.month}</div>
                <div className="meta-list">
                  <div>Planned: {formatMoney(item.planned)}</div>
                  <div>Paid: {formatMoney(item.paid)}</div>
                  <div>Total: {formatMoney(item.total)}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="assistant-list">
            {advice.map((message) => (
              <div key={message} className="assistant-card">
                <div className="assistant-title">Accounting coach</div>
                <p className="assistant-message">{message}</p>
              </div>
            ))}
          </div>

          <div className="stack">
            {summary?.expenses.map((expense) => (
              <div key={expense.id} className="list-row">
                <div>
                  <div className="list-title">{expense.title}</div>
                  <div className="list-subtitle">
                    {expense.category} - {formatDisplayDate(expense.dueDate)} - {expense.recurrence.toLowerCase()} - {expense.status.toLowerCase()}
                  </div>
                </div>
                <div className="list-actions">
                  <div className="list-title">{formatMoney(expense.amount)}</div>
                  <Button variant="secondary" onClick={() => selectExpense(expense)}>
                    Edit
                  </Button>
                  <Button variant="danger" onClick={() => removeExpense(expense.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <div className="stack">
        <Panel title={selectedId ? "Edit expense" : "New expense"} subtitle="Add a bill, fee, or future payment">
          <div className="stack">
            <Field label="Title">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Category">
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </Field>
            <Field label="Amount">
              <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            </Field>
            <Field label="Due date">
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </Field>
            <Field label="Recurrence">
              <select value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value as "ONE_TIME" | "MONTHLY" })}>
                <option value="ONE_TIME">One-time</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "PLANNED" | "PAID" })}>
                <option value="PLANNED">Planned</option>
                <option value="PAID">Paid</option>
              </select>
            </Field>
            <Field label="Notes">
              <textarea rows={4} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <Button onClick={saveExpense} disabled={saving}>
              {saving ? "Saving..." : selectedId ? "Update expense" : "Create expense"}
            </Button>
          </div>
        </Panel>

        <Panel title="Cashflow scenarios" subtitle="Test a purchase, income shock, or extra days off">
          <div className="stack">
            <Field label="Extra expense">
              <input
                type="number"
                min="0"
                step="0.01"
                value={planningInputs.extraExpense}
                onChange={(e) => setPlanningInputs({ ...planningInputs, extraExpense: Number(e.target.value) })}
              />
            </Field>
            <Field label="Income shock %">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={planningInputs.incomeShockPercent}
                onChange={(e) => setPlanningInputs({ ...planningInputs, incomeShockPercent: Number(e.target.value) })}
              />
            </Field>
            <Field label="Extra days off">
              <input
                type="number"
                min="0"
                step="1"
                value={planningInputs.extraDaysOff}
                onChange={(e) => setPlanningInputs({ ...planningInputs, extraDaysOff: Number(e.target.value) })}
              />
            </Field>

            {planning ? (
              <div className="assistant-list">
                {planning.scenarios.map((scenario) => (
                  <article key={scenario.label} className="assistant-card">
                    <div className="assistant-title">{scenario.label}</div>
                    <p className="assistant-message">{scenario.message}</p>
                    <div className="meta-list">
                      <div>Projected income: {formatMoney(scenario.projectedIncome)}</div>
                      <div>Safe to spend: {formatMoney(scenario.safeToSpend)}</div>
                      <div>Remaining after goals: {formatMoney(scenario.remainingAfterGoals)}</div>
                      <div>Shortfall: {formatMoney(scenario.shortfall)}</div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="body-copy">Adjust the inputs above to see what happens before you commit to the expense.</p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

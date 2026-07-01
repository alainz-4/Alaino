import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { currentMonthKey } from "../lib/dates";
import type { BootstrapResponse, CalendarResponse, ContractDTO, WorkDayUpdatePayload } from "../types";
import CalendarMonthView from "../components/CalendarMonthView";
import { Panel } from "../components/Common";
import { formatMoney } from "../lib/format";

type Props = {
  bootstrap: BootstrapResponse | null;
};

export default function CalendarPage({ bootstrap }: Props) {
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null);
  const [contracts, setContracts] = useState<ContractDTO[]>([]);

  useEffect(() => {
    reload();
  }, [monthKey]);

  async function reload() {
    const [calendarData, contractData] = await Promise.all([
      api.get<CalendarResponse>(`/api/calendar/${monthKey}`),
      api.get<ContractDTO[]>("/api/contracts")
    ]);
    setCalendar(calendarData);
    setContracts(contractData);
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
          <div className="eyebrow">Calendar</div>
          <h1>Mark each day as working or off.</h1>
          <p>
            The month view feeds your projected income and invoice drafts, so the calendar is the heart of the app.
          </p>
        </div>
      </header>

      <Panel title="Projection" subtitle="Updated live from your calendar and contracts">
        <div className="kpi-grid compact">
          <div className="mini-kpi">Projected income: {formatMoney(calendar?.projection.projectedIncome ?? 0)}</div>
          <div className="mini-kpi">Working days: {calendar?.projection.workingDaysCount ?? 0}</div>
          <div className="mini-kpi">Off days: {calendar?.projection.offDaysCount ?? 0}</div>
          <div className="mini-kpi">Recommended daily rate: {formatMoney(calendar?.projection.recommendedDailyRate ?? 0)}</div>
        </div>
      </Panel>

      <CalendarMonthView
        monthKey={monthKey}
        days={calendar?.days ?? []}
        contracts={contracts}
        onMonthChange={setMonthKey}
        onSaveDay={saveDay}
        onSaveDays={saveDays}
      />

      <Panel title="Freelancer note" subtitle="From your profile">
        <p className="body-copy">
          {bootstrap?.profile.fullName ?? "Your profile"} should keep the selected monthly schedule aligned with the invoice calendar, so each working day maps to a contract and a daily rate.
        </p>
      </Panel>
    </div>
  );
}

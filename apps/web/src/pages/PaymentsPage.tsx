import { useState } from "react";
import { currentMonthKey } from "../lib/dates";
import type { BootstrapResponse } from "../types";
import PaymentLogPanel from "../components/PaymentLogPanel";

type Props = {
  bootstrap: BootstrapResponse | null;
};

export default function PaymentsPage({ bootstrap }: Props) {
  const [monthKey, setMonthKey] = useState(currentMonthKey());

  return (
    <div className="page-stack">
      <header className="page-hero">
        <div>
          <div className="eyebrow">Payments</div>
          <h1>Log what you received without cluttering the dashboard.</h1>
          <p>Use this space to record invoices paid, deposits, and other income as soon as money lands.</p>
        </div>
        <div className="hero-actions">
          <label className="field">
            <span className="field-label">Selected month</span>
            <input type="month" value={monthKey} onChange={(event) => setMonthKey(event.target.value)} />
          </label>
        </div>
      </header>

      <PaymentLogPanel monthKey={monthKey} bootstrap={bootstrap} />
    </div>
  );
}

import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import CalendarPage from "./pages/CalendarPage";
import ExpensesPage from "./pages/ExpensesPage";
import InvoicesPage from "./pages/InvoicesPage";
import SettingsPage from "./pages/SettingsPage";
import ClientsPage from "./pages/ClientsPage";
import ContractsPage from "./pages/ContractsPage";
import PaymentsPage from "./pages/PaymentsPage";
import AssistantHistoryPage from "./pages/AssistantHistoryPage";
import { useEffect, useState } from "react";
import type { BootstrapResponse } from "./types";
import { api } from "./lib/api";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/assistant-history", label: "Alonso AI", icon: "/brandmark.svg" },
  { to: "/calendar", label: "Calendar" },
  { to: "/expenses", label: "Expenses" },
  { to: "/payments", label: "Receive payment" },
  { to: "/invoices", label: "Invoices" },
  { to: "/clients", label: "Clients" },
  { to: "/contracts", label: "Contracts" },
  { to: "/settings", label: "Settings" }
];

export default function App() {
  const [bootstrap, setBootstrap] = useState<BootstrapResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadBootstrap() {
      setError(null);

      for (let attempt = 0; attempt < 8 && !cancelled; attempt += 1) {
        try {
          const data = await api.get<BootstrapResponse>("/api/settings/bootstrap");
          if (!cancelled) {
            setBootstrap(data);
            setError(null);
          }
          return;
        } catch (err) {
          if (cancelled || controller.signal.aborted) {
            return;
          }

          if (attempt === 7) {
            setError(err instanceof Error ? err.message : "Failed to fetch");
            return;
          }

          await new Promise((resolve) => window.setTimeout(resolve, 500));
        }
      }
    }

    void loadBootstrap();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <img src="/brandmark.svg" alt="" />
          </div>
          <div>
            <div className="brand-title">ALAINO freelance</div>
            <div className="brand-subtitle">Income, invoices, runway</div>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              {item.icon ? (
                <span className="nav-link-ai">
                  <span className="nav-link-ai-mark" aria-hidden="true">
                    <img src={item.icon} alt="" />
                  </span>
                  <span>{item.label}</span>
                </span>
              ) : (
                item.label
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <div className="sidebar-label">Workspace</div>
          <div className="sidebar-value">{bootstrap?.profile.fullName ?? "Loading..."}</div>
          <div className="sidebar-muted">{bootstrap?.profile.legalStatus ?? "Preparing profile"}</div>
        </div>
      </aside>

      <main className="main-content">
        {error ? <div className="error-banner">{error}</div> : null}
        <Routes>
          <Route path="/" element={<DashboardPage bootstrap={bootstrap} />} />
          <Route path="/calendar" element={<CalendarPage bootstrap={bootstrap} />} />
          <Route path="/expenses" element={<ExpensesPage bootstrap={bootstrap} />} />
          <Route path="/payments" element={<PaymentsPage bootstrap={bootstrap} />} />
          <Route path="/invoices" element={<InvoicesPage bootstrap={bootstrap} />} />
          <Route path="/assistant-history" element={<AssistantHistoryPage bootstrap={bootstrap} />} />
          <Route path="/clients" element={<ClientsPage bootstrap={bootstrap} />} />
          <Route path="/contracts" element={<ContractsPage bootstrap={bootstrap} />} />
          <Route path="/settings" element={<SettingsPage bootstrap={bootstrap} onBootstrapChange={setBootstrap} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

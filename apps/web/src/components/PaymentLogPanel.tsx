import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { formatMoney } from "../lib/format";
import { formatDisplayDate } from "../lib/dates";
import type { BootstrapResponse, ClientDTO, InvoiceDTO, PaymentLogDTO } from "../types";
import { Button, Chip, Field, Panel } from "./Common";

type Props = {
  monthKey: string;
  bootstrap: BootstrapResponse | null;
};

type PaymentFormState = {
  kind: PaymentLogDTO["kind"];
  title: string;
  amount: number;
  currency: string;
  receivedAt: string;
  method: string;
  invoiceId: string;
  clientId: string;
  notes: string;
};

const emptyForm = (currency = "EUR"): PaymentFormState => ({
  kind: "INVOICE_PAYMENT",
  title: "",
  amount: 0,
  currency,
  receivedAt: new Date().toISOString().slice(0, 10),
  method: "",
  invoiceId: "",
  clientId: "",
  notes: ""
});

export default function PaymentLogPanel({ monthKey, bootstrap }: Props) {
  const [payments, setPayments] = useState<PaymentLogDTO[]>([]);
  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [invoices, setInvoices] = useState<InvoiceDTO[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<PaymentFormState>(emptyForm(bootstrap?.freelanceSettings.defaultCurrency ?? "EUR"));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedId(null);
    setForm(emptyForm(bootstrap?.freelanceSettings.defaultCurrency ?? "EUR"));
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);

  async function reload(preferredId?: string | null) {
    setLoading(true);
    try {
      const [paymentData, clientData, invoiceData] = await Promise.all([
        api.get<PaymentLogDTO[]>(`/api/payments?month=${monthKey}&limit=8`),
        api.get<ClientDTO[]>("/api/clients"),
        api.get<InvoiceDTO[]>("/api/invoices")
      ]);
      setPayments(paymentData);
      setClients(clientData);
      setInvoices(invoiceData);
      if (preferredId) {
        setSelectedId(preferredId);
      }
    } finally {
      setLoading(false);
    }
  }

  const selectedPayment = useMemo(() => payments.find((payment) => payment.id === selectedId) ?? null, [payments, selectedId]);

  useEffect(() => {
    if (!selectedPayment) {
      return;
    }

    setForm({
      kind: selectedPayment.kind,
      title: selectedPayment.title,
      amount: selectedPayment.amount,
      currency: selectedPayment.currency,
      receivedAt: selectedPayment.receivedAt.slice(0, 10),
      method: selectedPayment.method ?? "",
      invoiceId: selectedPayment.invoiceId ?? "",
      clientId: selectedPayment.clientId ?? "",
      notes: selectedPayment.notes ?? ""
    });
  }, [selectedPayment]);

  const monthTotal = useMemo(() => payments.reduce((sum, payment) => sum + payment.amount, 0), [payments]);

  function syncContext(nextInvoiceId: string) {
    setForm((current) => {
      const invoice = invoices.find((item) => item.id === nextInvoiceId);
      if (!invoice) {
        return {
          ...current,
          invoiceId: "",
          clientId: ""
        };
      }

      return {
        ...current,
        invoiceId: invoice.id,
        clientId: invoice.client.id,
        title: current.title || `Payment for ${invoice.invoiceNumber}`
      };
    });
  }

  async function savePayment() {
    setSaving(true);
    try {
      const payload = {
        kind: form.kind,
        title: form.title,
        amount: form.amount,
        currency: form.currency,
        receivedAt: form.receivedAt,
        method: form.method || null,
        invoiceId: form.invoiceId || null,
        clientId: form.clientId || null,
        notes: form.notes || null
      };

      if (selectedId) {
        await api.put(`/api/payments/${selectedId}`, payload);
      } else {
        await api.post("/api/payments", payload);
      }

      setSelectedId(null);
      setForm(emptyForm(bootstrap?.freelanceSettings.defaultCurrency ?? "EUR"));
      await reload(null);
    } finally {
      setSaving(false);
    }
  }

  async function deletePayment(id: string) {
    await api.delete(`/api/payments/${id}`);
    if (selectedId === id) {
      setSelectedId(null);
      setForm(emptyForm(bootstrap?.freelanceSettings.defaultCurrency ?? "EUR"));
    }
    await reload();
  }

  return (
    <Panel
      title="Payments received"
      subtitle="Log when cash lands, link it to an invoice, and keep a clean record of what was paid"
      actions={<Chip tone="green">{formatMoney(monthTotal)} this month</Chip>}
    >
      <div className="payment-log">
        <div className="payment-log-list">
          {loading ? (
            <div className="empty-state">Loading payment history...</div>
          ) : payments.length === 0 ? (
            <div className="empty-state">No payments logged yet for this month.</div>
          ) : (
            payments.map((payment) => (
              <button
                key={payment.id}
                type="button"
                className={`payment-row ${selectedId === payment.id ? "selected" : ""}`}
                onClick={() => setSelectedId(payment.id)}
              >
                <div>
                  <div className="list-title">{payment.title}</div>
                  <div className="list-subtitle">
                    {formatDisplayDate(payment.receivedAt)} - {payment.kind.replaceAll("_", " ").toLowerCase()}
                    {payment.invoice ? ` - ${payment.invoice.invoiceNumber}` : ""}
                  </div>
                </div>
                <div className="payment-row-meta">
                  <Chip tone="blue">{formatMoney(payment.amount)}</Chip>
                  <span className="payment-row-action">{payment.method || "Bank transfer"}</span>
                </div>
              </button>
            ))
          )}
        </div>

        <form
          className="payment-log-form"
          onSubmit={async (event) => {
            event.preventDefault();
            await savePayment();
          }}
        >
          <Field label="Payment type">
            <select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as PaymentLogDTO["kind"] })}>
              <option value="INVOICE_PAYMENT">Invoice payment</option>
              <option value="CLIENT_DEPOSIT">Client deposit</option>
              <option value="OTHER">Other income</option>
            </select>
          </Field>

          <Field label="Title">
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Invoice INV-2026-001" />
          </Field>

          <Field label="Amount">
            <input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} />
          </Field>

          <Field label="Received on">
            <input type="date" value={form.receivedAt} onChange={(event) => setForm({ ...form, receivedAt: event.target.value })} />
          </Field>

          <Field label="Invoice">
            <select value={form.invoiceId} onChange={(event) => syncContext(event.target.value)}>
              <option value="">No linked invoice</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber} - {invoice.client.name} - {formatMoney(invoice.total)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Client">
            <select value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })}>
              <option value="">No client selected</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Payment method">
            <input value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })} placeholder="Bank transfer, cash, Wise..." />
          </Field>

          <Field label="Notes">
            <textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </Field>

          <div className="payment-log-actions">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : selectedId ? "Update payment" : "Log payment"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSelectedId(null);
                setForm(emptyForm(bootstrap?.freelanceSettings.defaultCurrency ?? "EUR"));
              }}
            >
              Clear
            </Button>
            {selectedId ? (
              <Button type="button" variant="danger" onClick={() => void deletePayment(selectedId)}>
                Delete
              </Button>
            ) : null}
          </div>
        </form>
      </div>
    </Panel>
  );
}

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { BootstrapResponse, ClientDTO, ContractDTO, InvoiceDTO } from "../types";
import { formatMoney } from "../lib/format";
import { Button, Field, Panel, Chip } from "../components/Common";
import InvoicePreview from "../components/InvoicePreview";
import { formatDisplayDate } from "../lib/dates";

type Props = {
  bootstrap: BootstrapResponse | null;
};

export default function InvoicesPage({ bootstrap }: Props) {
  const [invoices, setInvoices] = useState<InvoiceDTO[]>([]);
  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [contracts, setContracts] = useState<ContractDTO[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    clientId: "",
    contractId: "",
    startDate: "",
    endDate: "",
    issueDate: new Date().toISOString().slice(0, 10),
    notes: ""
  });

  useEffect(() => {
    reload();
  }, []);

  async function reload(preferredInvoiceId?: string | null) {
    const [invoiceData, clientData, contractData] = await Promise.all([
      api.get<InvoiceDTO[]>("/api/invoices"),
      api.get<ClientDTO[]>("/api/clients"),
      api.get<ContractDTO[]>("/api/contracts")
    ]);
    setInvoices(invoiceData);
    setClients(clientData);
    setContracts(contractData);
    if (preferredInvoiceId) {
      setSelectedInvoiceId(preferredInvoiceId);
      return;
    }
    if (!selectedInvoiceId && invoiceData[0]) {
      setSelectedInvoiceId(invoiceData[0].id);
    }
  }

  async function createDraft() {
    const created = await api.post<InvoiceDTO>("/api/invoices/drafts", {
      clientId: draft.clientId,
      contractId: draft.contractId || null,
      startDate: draft.startDate,
      endDate: draft.endDate,
      issueDate: draft.issueDate || null,
      notes: draft.notes || null
    });
    setDraft({ clientId: "", contractId: "", startDate: "", endDate: "", issueDate: new Date().toISOString().slice(0, 10), notes: "" });
    await reload(created.id);
  }

  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null;

  async function updateStatus(status: InvoiceDTO["status"]) {
    if (!selectedInvoiceId) return;
    await api.put(`/api/invoices/${selectedInvoiceId}`, { status });
    await reload();
  }

  async function deleteSelectedInvoice() {
    if (!selectedInvoiceId) {
      return;
    }

    const invoiceNumber = selectedInvoice?.invoiceNumber ?? selectedInvoiceId;
    const confirmDelete = window.confirm(
      `Delete invoice ${invoiceNumber}? This will remove the invoice and its lines permanently.`
    );
    if (!confirmDelete) {
      return;
    }

    await api.delete(`/api/invoices/${selectedInvoiceId}`);
    const remaining = invoices.filter((invoice) => invoice.id !== selectedInvoiceId);
    setSelectedInvoiceId(remaining[0]?.id ?? null);
    await reload(remaining[0]?.id ?? null);
  }

  return (
    <div className="page-stack invoices-layout">
      <Panel title="Create invoice draft" subtitle="Aggregate billable days for a client and period">
        <div className="stack">
          <Field label="Client">
            <select value={draft.clientId} onChange={(e) => setDraft({ ...draft, clientId: e.target.value })}>
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Contract (optional)">
            <select value={draft.contractId} onChange={(e) => setDraft({ ...draft, contractId: e.target.value })}>
              <option value="">Any contract</option>
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>{contract.title}</option>
              ))}
            </select>
          </Field>
          <Field label="Service start"><input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} /></Field>
          <Field label="Service end"><input type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} /></Field>
          <Field label="Issue date" help="This is the date that appears on the invoice and determines the due date.">
            <input type="date" value={draft.issueDate} onChange={(e) => setDraft({ ...draft, issueDate: e.target.value })} />
          </Field>
          <Field label="Notes"><textarea rows={4} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
          <Button onClick={createDraft} disabled={!draft.clientId || !draft.startDate || !draft.endDate}>
            Create draft from calendar
          </Button>
        </div>
      </Panel>

      <div className="invoices-grid">
        <Panel title="Invoices" subtitle="Draft, sent, paid, and overdue totals">
          <div className="stack">
            {invoices.map((invoice) => (
              <div key={invoice.id} className={`invoice-list-row ${selectedInvoiceId === invoice.id ? "selected" : ""}`} onClick={() => setSelectedInvoiceId(invoice.id)}>
                <div>
                  <div className="list-title">{invoice.invoiceNumber}</div>
                  <div className="list-subtitle">{invoice.client.name} - {formatDisplayDate(invoice.issueDate)}</div>
                </div>
                <div className="invoice-row-meta">
                  <Chip tone={invoice.status === "PAID" ? "green" : invoice.status === "OVERDUE" ? "red" : invoice.status === "SENT" ? "amber" : "neutral"}>{invoice.status}</Chip>
                  <span>{formatMoney(invoice.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="stack">
          <Panel title="Invoice details" subtitle="Update status and preview the PDF">
            {selectedInvoice ? (
              <div className="stack">
                <div className="detail-grid">
                  <div><strong>{selectedInvoice.client.name}</strong></div>
                  <div>{formatDisplayDate(selectedInvoice.servicePeriodStart)} to {formatDisplayDate(selectedInvoice.servicePeriodEnd)}</div>
                  <div>Subtotal: {formatMoney(selectedInvoice.subtotal)}</div>
                  <div>VAT: {formatMoney(selectedInvoice.vatAmount)}</div>
                  <div>Total: {formatMoney(selectedInvoice.total)}</div>
                </div>
                <Field label="Status">
                  <select value={selectedInvoice.status} onChange={(e) => updateStatus(e.target.value as InvoiceDTO["status"])}>
                    <option value="DRAFT">Draft</option>
                    <option value="SENT">Sent</option>
                    <option value="PAID">Paid</option>
                    <option value="OVERDUE">Overdue</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </Field>
                <div className="preview-actions">
                  <a
                    className="button secondary"
                    href={`/api/invoices/${selectedInvoice.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open PDF
                  </a>
                  <a
                    className="button secondary"
                    href={`/api/invoices/${selectedInvoice.id}/pdf?download=1`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download PDF
                  </a>
                  <Button variant="danger" onClick={() => void deleteSelectedInvoice()}>
                    Delete invoice
                  </Button>
                </div>
                <InvoicePreview invoiceId={selectedInvoice.id} title={`Preview ${selectedInvoice.invoiceNumber}`} />
              </div>
            ) : (
              <div className="empty-state">No invoice selected yet.</div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { ClientDTO, ContractDTO, BootstrapResponse } from "../types";
import { emptyContract } from "../lib/empty";
import { Button, Field, Panel } from "../components/Common";
import { formatDisplayDate } from "../lib/dates";

type Props = {
  bootstrap: BootstrapResponse | null;
};

export default function ContractsPage({ bootstrap }: Props) {
  const [contracts, setContracts] = useState<ContractDTO[]>([]);
  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyContract);

  useEffect(() => {
    reload();
  }, []);

  async function reload() {
    const [contractsData, clientsData] = await Promise.all([
      api.get<ContractDTO[]>("/api/contracts"),
      api.get<ClientDTO[]>("/api/clients")
    ]);
    setContracts(contractsData);
    setClients(clientsData);
  }

  function selectContract(contract: ContractDTO) {
    setSelectedId(contract.id);
    setForm({
      clientId: contract.clientId,
      title: contract.title,
      paymentType: contract.paymentType,
      startDate: contract.startDate.slice(0, 10),
      endDate: contract.endDate?.slice(0, 10) ?? "",
      dailyRate: contract.dailyRate ?? 0,
      monthlyRetainerAmount: contract.monthlyRetainerAmount ?? 0,
      fixedProjectAmount: contract.fixedProjectAmount ?? 0,
      fixedProjectDate: contract.fixedProjectDate?.slice(0, 10) ?? "",
      billingDayOfMonth: contract.billingDayOfMonth ?? 1,
      active: contract.active,
      notes: contract.notes ?? ""
    });
  }

  async function saveContract() {
    const payload = {
      ...form,
      endDate: form.endDate || null,
      fixedProjectDate: form.fixedProjectDate || null,
      notes: form.notes || null
    };
    if (selectedId) {
      await api.put(`/api/contracts/${selectedId}`, payload);
    } else {
      await api.post("/api/contracts", payload);
    }
    setSelectedId(null);
    setForm(emptyContract);
    await reload();
  }

  async function removeContract(id: string) {
    await api.delete(`/api/contracts/${id}`);
    if (selectedId === id) {
      setSelectedId(null);
      setForm(emptyContract);
    }
    await reload();
  }

  return (
    <div className="page-stack two-column">
      <Panel title="Contracts" subtitle="Attach a rate and payment model to each client relationship">
        <div className="stack">
          {contracts.map((contract) => (
            <div key={contract.id} className="list-row">
              <div>
                <div className="list-title">{contract.title}</div>
                <div className="list-subtitle">
                  {contract.client.name} - {contract.paymentType}
                  {contract.startDate ? ` - ${formatDisplayDate(contract.startDate)}` : ""}
                  {contract.endDate ? ` to ${formatDisplayDate(contract.endDate)}` : ""}
                </div>
              </div>
              <div className="list-actions">
                <Button variant="secondary" onClick={() => selectContract(contract)}>Edit</Button>
                <Button variant="danger" onClick={() => removeContract(contract.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title={selectedId ? "Edit contract" : "New contract"} subtitle="Used in calendar days and invoice drafts">
        <div className="stack">
          <Field label="Client">
            <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Payment type">
            <select value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value as typeof form.paymentType })}>
              <option value="DAILY">Daily rate</option>
              <option value="RETAINER">Retainer</option>
              <option value="FIXED">Fixed project</option>
            </select>
          </Field>
          <Field label="Start date"><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
          <Field label="End date"><input type="date" value={form.endDate ?? ""} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
          <Field label="Daily rate"><input type="number" value={form.dailyRate ?? 0} onChange={(e) => setForm({ ...form, dailyRate: Number(e.target.value) })} step="0.01" min="0" /></Field>
          <Field label="Monthly retainer"><input type="number" value={form.monthlyRetainerAmount ?? 0} onChange={(e) => setForm({ ...form, monthlyRetainerAmount: Number(e.target.value) })} step="0.01" min="0" /></Field>
          <Field label="Fixed amount"><input type="number" value={form.fixedProjectAmount ?? 0} onChange={(e) => setForm({ ...form, fixedProjectAmount: Number(e.target.value) })} step="0.01" min="0" /></Field>
          <Field label="Fixed payment date"><input type="date" value={form.fixedProjectDate ?? ""} onChange={(e) => setForm({ ...form, fixedProjectDate: e.target.value })} /></Field>
          <Field label="Billing day of month"><input type="number" value={form.billingDayOfMonth ?? 1} onChange={(e) => setForm({ ...form, billingDayOfMonth: Number(e.target.value) })} min="1" max="31" /></Field>
          <label className="checkbox-row">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            <span>Active</span>
          </label>
          <Field label="Notes"><textarea rows={4} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <Button onClick={saveContract}>{selectedId ? "Update contract" : "Create contract"}</Button>
        </div>
      </Panel>
    </div>
  );
}

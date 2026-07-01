import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { BootstrapResponse, ClientDTO } from "../types";
import { emptyClient } from "../lib/empty";
import { Button, Field, Panel } from "../components/Common";

type Props = {
  bootstrap: BootstrapResponse | null;
};

export default function ClientsPage({ bootstrap }: Props) {
  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyClient);

  useEffect(() => {
    reload();
  }, []);

  async function reload() {
    const data = await api.get<ClientDTO[]>("/api/clients");
    setClients(data);
  }

  function selectClient(client: ClientDTO) {
    setSelectedId(client.id);
    setForm({
      name: client.name,
      legalName: client.legalName ?? "",
      addressLine1: client.addressLine1,
      addressLine2: client.addressLine2 ?? "",
      postalCode: client.postalCode,
      city: client.city,
      country: client.country,
      vatNumber: client.vatNumber ?? "",
      email: client.email ?? "",
      contactName: client.contactName ?? "",
      notes: client.notes ?? ""
    });
  }

  async function saveClient() {
    const payload = {
      ...form,
      legalName: form.legalName || null,
      addressLine2: form.addressLine2 || null,
      vatNumber: form.vatNumber || null,
      email: form.email || null,
      contactName: form.contactName || null,
      notes: form.notes || null
    };
    if (selectedId) {
      await api.put(`/api/clients/${selectedId}`, payload);
    } else {
      await api.post("/api/clients", payload);
    }
    setSelectedId(null);
    setForm(emptyClient);
    await reload();
  }

  async function removeClient(id: string) {
    await api.delete(`/api/clients/${id}`);
    if (selectedId === id) {
      setSelectedId(null);
      setForm(emptyClient);
    }
    await reload();
  }

  return (
    <div className="page-stack two-column">
      <Panel title="Clients" subtitle="Create or edit client identities used on invoices">
        <div className="stack">
          {clients.map((client) => (
            <div key={client.id} className="list-row">
              <div>
                <div className="list-title">{client.name}</div>
                <div className="list-subtitle">{client.city}, {client.country}</div>
              </div>
              <div className="list-actions">
                <Button variant="secondary" onClick={() => selectClient(client)}>Edit</Button>
                <Button variant="danger" onClick={() => removeClient(client.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title={selectedId ? "Edit client" : "New client"} subtitle={bootstrap?.profile.fullName ?? "Workspace"}>
        <div className="stack">
          <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Legal name"><input value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} /></Field>
          <Field label="Address"><input value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} /></Field>
          <Field label="Address line 2"><input value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} /></Field>
          <Field label="Postal code"><input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} /></Field>
          <Field label="City"><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <Field label="Country"><input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
          <Field label="VAT number"><input value={form.vatNumber} onChange={(e) => setForm({ ...form, vatNumber: e.target.value })} /></Field>
          <Field label="Email"><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Contact"><input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></Field>
          <Field label="Notes"><textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <Button onClick={saveClient}>{selectedId ? "Update client" : "Create client"}</Button>
        </div>
      </Panel>
    </div>
  );
}

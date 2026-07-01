import { Panel } from "./Common";
import { apiBaseUrl } from "../lib/api";

type InvoicePreviewProps = {
  invoiceId?: string | null;
  title?: string;
};

export default function InvoicePreview({ invoiceId, title }: InvoicePreviewProps) {
  if (!invoiceId) {
    return (
      <Panel title={title ?? "Invoice preview"} subtitle="Select an invoice to preview the PDF">
        <div className="empty-state">No invoice selected yet.</div>
      </Panel>
    );
  }

  return (
    <Panel title={title ?? "Invoice preview"} subtitle="Rendered directly from the backend PDF route">
      <iframe
        className="invoice-frame"
        title="Invoice PDF preview"
        src={`${apiBaseUrl}/api/invoices/${invoiceId}/pdf`}
      />
      <div className="preview-actions">
        <a className="button secondary" href={`${apiBaseUrl}/api/invoices/${invoiceId}/pdf?download=1`} target="_blank" rel="noreferrer">
          Download PDF
        </a>
      </div>
    </Panel>
  );
}

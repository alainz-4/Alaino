export function buildInvoiceNumber(prefix: string, sequenceNumber: number): string {
  return `${prefix}-${String(sequenceNumber).padStart(4, "0")}`;
}

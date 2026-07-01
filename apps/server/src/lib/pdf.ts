import PDFDocument from "pdfkit";
import fs from "node:fs/promises";
import path from "node:path";
import { format } from "date-fns";
import type { Invoice, InvoiceLine, InvoiceSettings, Client, UserProfile } from "@prisma/client";
import { toNumber } from "./number.js";

export async function buildInvoicePdfBuffer(params: {
  invoice: Invoice & { lines: InvoiceLine[]; client: Client; userProfile: UserProfile };
  settings: InvoiceSettings;
}): Promise<Buffer> {
  const logoBuffer = await resolveLogoBuffer(params.settings.logoUrl);
  const signatureBuffer = await resolveImageBuffer(params.settings.signatureUrl);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 48,
      bufferPages: true
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer | Uint8Array) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    try {
      renderInvoicePdf(doc, params.invoice, params.settings, logoBuffer, signatureBuffer);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function renderInvoicePdf(
  doc: any,
  invoice: Invoice & { lines: InvoiceLine[] },
  settings: InvoiceSettings,
  logoBuffer: Buffer | null,
  signatureBuffer: Buffer | null
) {
  const primary = settings.primaryColor ?? "#17324d";
  const secondary = settings.secondaryColor ?? "#eaf0f6";
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const rightColumnX = 292;
  const rightColumnWidth = pageWidth - (rightColumnX - doc.page.margins.left);
  const tableColumns = {
    descriptionX: 60,
    descriptionWidth: 220,
    daysX: 335,
    daysWidth: 45,
    unitPriceX: 405,
    unitPriceWidth: 68,
    totalX: 487,
    totalWidth: 50
  };
  const tableRowHeight = 32;

  doc.rect(0, 0, doc.page.width, 120).fill(primary);
  doc.fillColor("#ffffff").fontSize(24).font("Helvetica-Bold").text("Invoice", 48, 36);
  doc.fontSize(11).font("Helvetica").text(`Invoice number: ${invoice.invoiceNumber}`, 48, 68);
  doc.text(`Issue date: ${formatInvoiceDate(invoice.issueDate)}`, 48, 84, { width: 220 });
  doc.text(`Due date: ${formatInvoiceDate(invoice.dueDate ?? invoice.issueDate)}`, 240, 84, {
    width: 150,
    align: "left"
  });

  renderLogo(doc, logoBuffer);

  doc.roundedRect(48, 140, pageWidth, 86, 10).fillAndStroke(secondary, "#d6dee8");
  doc.fillColor("#17324d").fontSize(12).font("Helvetica-Bold").text("Issuer", 60, 154);
  doc.font("Helvetica").fontSize(10).text(invoice.issuerName, 60, 172);
  doc.text(invoice.issuerLegalStatus, 60, 186);
  doc.text(invoice.issuerAddressLine1, 60, 200);
  if (invoice.issuerAddressLine2) {
    doc.text(invoice.issuerAddressLine2, 60, 214);
  }
  doc.text(`${invoice.issuerPostalCode} ${invoice.issuerCity}`, rightColumnX, 172, {
    width: rightColumnWidth
  });
  doc.text(invoice.issuerCountry, rightColumnX, 186, {
    width: rightColumnWidth
  });
  renderIssuerIdentifiers(doc, invoice, rightColumnX, 200, rightColumnWidth);

  const clientTop = 244;
  doc.roundedRect(48, clientTop, pageWidth, 86, 10).stroke("#d6dee8");
  doc.fillColor("#17324d").fontSize(12).font("Helvetica-Bold").text("Client", 60, clientTop + 14);
  doc.font("Helvetica").fontSize(10).fillColor("#222").text(invoice.clientName, 60, clientTop + 32);
  if (invoice.clientLegalName) {
    doc.text(invoice.clientLegalName, 60, clientTop + 46);
  }
  doc.text(invoice.clientAddressLine1, rightColumnX, clientTop + 32, {
    width: rightColumnWidth
  });
  if (invoice.clientAddressLine2) {
    doc.text(invoice.clientAddressLine2, rightColumnX, clientTop + 46, {
      width: rightColumnWidth
    });
  }
  doc.text(`${invoice.clientPostalCode} ${invoice.clientCity}`, rightColumnX, clientTop + 60, {
    width: rightColumnWidth
  });
  doc.text(invoice.clientCountry, rightColumnX, clientTop + 74, {
    width: rightColumnWidth
  });

  const tableTop = 352;
  renderTableHeader(doc, tableTop, pageWidth, tableColumns);

  let y = tableTop + 28;
  invoice.lines.forEach((line, index) => {
    if (y > 700) {
      doc.addPage();
      y = 60;
      renderTableHeader(doc, y - 4, pageWidth, tableColumns);
      y += tableRowHeight;
    }

    const quantity = toNumber(line.quantityDays).toFixed(2).replace(/\.00$/, "");
    doc.fillColor(index % 2 === 0 ? "#ffffff" : "#f8fbfd");
    doc.rect(48, y - 4, pageWidth, tableRowHeight).fill();
    doc.fillColor("#222").font("Helvetica").fontSize(10);
    doc.text(line.description, tableColumns.descriptionX, y + 1, {
      width: tableColumns.descriptionWidth,
      height: tableRowHeight - 4,
      ellipsis: true
    });
    doc.text(quantity, tableColumns.daysX, y + 7, {
      width: tableColumns.daysWidth,
      align: "right"
    });
    doc.text(formatMoney(toNumber(line.unitPrice), invoice.currency), tableColumns.unitPriceX, y + 7, {
      width: tableColumns.unitPriceWidth,
      align: "right"
    });
    doc.text(formatMoney(toNumber(line.total), invoice.currency), tableColumns.totalX, y + 7, {
      width: tableColumns.totalWidth,
      align: "right"
    });
    renderTableSeparators(doc, y - 4, tableRowHeight);
    y += tableRowHeight;
  });

  const subtotal = toNumber(invoice.subtotal);
  const vatAmount = toNumber(invoice.vatAmount);
  const total = toNumber(invoice.total);

  let totalsY = Math.max(y + 18, 500);
  if (totalsY > 660) {
    doc.addPage();
    totalsY = 60;
  }
  doc.roundedRect(297, totalsY, 250, 126, 10).stroke("#d6dee8");
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#17324d").text("Totals", 311, totalsY + 14);
  doc.font("Helvetica").fontSize(10).fillColor("#222");
  doc.text(`Subtotal`, 311, totalsY + 36);
  doc.text(formatMoney(subtotal, invoice.currency), 477, totalsY + 36, { width: 55, align: "right" });
  doc.text(invoice.vatMode === "APPLICABLE" ? `VAT (${toNumber(invoice.vatRate)}%)` : "VAT exemption", 311, totalsY + 54);
  doc.text(invoice.vatMode === "APPLICABLE" ? formatMoney(vatAmount, invoice.currency) : `0.00 ${invoice.currency}`, 477, totalsY + 54, {
    width: 55,
    align: "right"
  });
  doc.font("Helvetica-Bold").text(`Total`, 311, totalsY + 78);
  doc.text(formatMoney(total, invoice.currency), 477, totalsY + 78, { width: 55, align: "right" });

  doc.font("Helvetica").fontSize(9).fillColor("#444");
  doc.text(`Payment terms: ${invoice.paymentTermsDays} days`, 48, totalsY + 150);
  doc.text(`Late payment rate: ${toNumber(invoice.latePaymentRate)}%`, 48, totalsY + 164);
  doc.text(`Recovery charge: ${formatMoney(toNumber(invoice.recoveryChargeAmount), invoice.currency)}`, 48, totalsY + 178);

  if (invoice.vatMode === "EXEMPT" && invoice.vatExemptionMention) {
    doc.text(invoice.vatExemptionMention, 48, totalsY + 200, { width: pageWidth - 20 });
  }

  const footerTop = totalsY + 222;
  renderSignature(doc, signatureBuffer, footerTop);
  renderPaymentAccountDetails(doc, settings, footerTop);
}

function renderTableHeader(
  doc: any,
  y: number,
  pageWidth: number,
  columns: {
    descriptionX: number;
    descriptionWidth: number;
    daysX: number;
    daysWidth: number;
    unitPriceX: number;
    unitPriceWidth: number;
    totalX: number;
    totalWidth: number;
  }
) {
  doc.fillColor("#17324d").font("Helvetica-Bold").fontSize(10);
  doc.text("Description", columns.descriptionX, y);
  doc.text("Days", columns.daysX, y, { width: columns.daysWidth, align: "right" });
  doc.text("Unit price", columns.unitPriceX, y, { width: columns.unitPriceWidth, align: "right" });
  doc.text("Total", columns.totalX, y, { width: columns.totalWidth, align: "right" });
  doc.strokeColor("#d6dee8");
  doc.moveTo(48, y + 18).lineTo(48 + pageWidth, y + 18).stroke();
  renderHeaderSeparators(doc, y - 4, 28);
}

function renderHeaderSeparators(doc: any, top: number, height: number) {
  doc.strokeColor("#d6dee8");
  [324, 397, 480].forEach((x) => {
    doc.moveTo(x, top).lineTo(x, top + height).stroke();
  });
}

function renderTableSeparators(doc: any, top: number, height: number) {
  doc.strokeColor("#e0e7ef");
  [324, 397, 480].forEach((x) => {
    doc.moveTo(x, top).lineTo(x, top + height).stroke();
  });
}

function renderLogo(doc: any, logoBuffer: Buffer | null) {
  if (!logoBuffer) {
    return;
  }

  try {
    doc.image(logoBuffer, 398, 18, { fit: [132, 74] });
  } catch {
    // Silently skip invalid logo data so invoice rendering still works.
  }
}

function renderSignature(doc: any, signatureBuffer: Buffer | null, footerTop: number) {
  if (!signatureBuffer) {
    return;
  }

  const signatureTop = footerTop;
  doc.font("Helvetica").fontSize(9).fillColor("#444").text("Signature", 297, signatureTop);
  doc.roundedRect(297, signatureTop + 14, 250, 82, 10).stroke("#d6dee8");

  try {
    doc.image(signatureBuffer, 315, signatureTop + 22, { fit: [150, 50] });
  } catch {
    // Keep the invoice rendering resilient if the signature asset is invalid.
  }
}

function renderPaymentAccountDetails(doc: any, settings: InvoiceSettings, footerTop: number) {
  if (!settings.bankDetails?.trim()) {
    return;
  }

  const paymentTop = footerTop;
  doc.font("Helvetica").fontSize(9).fillColor("#444").text("Payment account details", 48, paymentTop);
  doc.roundedRect(48, paymentTop + 14, 230, 78, 10).stroke("#d6dee8");
  doc.font("Helvetica").fontSize(8.5).fillColor("#222").text(settings.bankDetails.trim(), 60, paymentTop + 24, {
    width: 206,
    height: 58
  });
}

function renderIssuerIdentifiers(doc: any, invoice: Invoice, x: number, y: number, width: number) {
  const lines: Array<string> = [];

  if (invoice.issuerSiren) {
    lines.push(`SIREN: ${invoice.issuerSiren}`);
  }
  if (invoice.issuerSiret) {
    lines.push(`SIRET: ${invoice.issuerSiret}`);
  }
  if (invoice.issuerCommercialRegisterNumber) {
    lines.push(`Commercial register: ${invoice.issuerCommercialRegisterNumber}`);
  }
  if (invoice.issuerTaxId) {
    lines.push(`Tax ID: ${invoice.issuerTaxId}`);
  }

  lines.forEach((line, index) => {
    doc.text(line, x, y + index * 14, { width });
  });
}

async function resolveLogoBuffer(logoUrl?: string | null): Promise<Buffer | null> {
  if (!logoUrl) {
    return null;
  }

  return resolveImageBuffer(logoUrl);
}

async function resolveImageBuffer(imageUrl?: string | null): Promise<Buffer | null> {
  if (!imageUrl) {
    return null;
  }

  try {
    if (imageUrl.startsWith("data:")) {
      const base64 = imageUrl.split(",")[1];
      return Buffer.from(base64, "base64");
    }

    if (path.isAbsolute(imageUrl)) {
      return await fs.readFile(imageUrl);
    }

    const candidate = path.resolve(process.cwd(), imageUrl);
    return await fs.readFile(candidate);
  } catch {
    return null;
  }
}

function formatInvoiceDate(date: Date) {
  return format(date, "dd/MM/yyyy");
}

function formatMoney(value: number, currency = "EUR") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency
  }).format(value);
}

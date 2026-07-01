import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncRoute } from "../lib/http.js";
import { ensureWorkspaceProfile, ensureInvoiceSettings } from "../lib/workspace.js";
import { serializeInvoice, serializeInvoiceLine } from "../lib/serializers.js";
import { AppError } from "../lib/errors.js";
import { createInvoiceDraftFromWorkDays, recalculateInvoiceTotals } from "../lib/invoice-service.js";
import { parseDateString } from "../lib/dates.js";
import { buildInvoicePdfBuffer } from "../lib/pdf.js";
import { toDecimal } from "../lib/number.js";

const router = Router();

const invoiceUpdateSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  notes: z.string().nullable().optional(),
  issueDate: z.string().optional(),
  servicePeriodStart: z.string().optional(),
  servicePeriodEnd: z.string().optional(),
  paymentTermsDays: z.number().int().min(0).optional(),
  latePaymentRate: z.number().min(0).optional(),
  recoveryChargeAmount: z.number().min(0).optional(),
  vatMode: z.enum(["APPLICABLE", "EXEMPT"]).optional(),
  vatRate: z.number().min(0).optional()
});

const lineSchema = z.object({
  description: z.string().min(1),
  quantityDays: z.number().min(0),
  unitPrice: z.number().min(0),
  sortOrder: z.number().int().min(0).optional()
});

const draftSchema = z.object({
  clientId: z.string().min(1),
  contractId: z.string().nullable().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  issueDate: z.string().min(1).optional(),
  notes: z.string().nullable().optional()
});

router.get(
  "/",
  asyncRoute(async (_req, res) => {
    const profile = await ensureWorkspaceProfile();
    const invoices = await prisma.invoice.findMany({
      where: { userProfileId: profile.id },
      include: {
        lines: true,
        client: true,
        contract: true
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(
      invoices.map((invoice) => ({
        ...serializeInvoice(invoice),
        client: invoice.client,
        contract: invoice.contract
          ? {
              id: invoice.contract.id,
              title: invoice.contract.title
            }
          : null
      }))
    );
  })
);

router.get(
  "/:id",
  asyncRoute(async (req, res) => {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        lines: { orderBy: { sortOrder: "asc" } },
        client: true,
        contract: true,
        userProfile: true
      }
    });

    if (!invoice) {
      throw new AppError(404, "Invoice not found");
    }

    res.json({
      ...serializeInvoice(invoice),
      client: invoice.client,
      contract: invoice.contract ? { id: invoice.contract.id, title: invoice.contract.title } : null,
      userProfile: invoice.userProfile
    });
  })
);

router.post(
  "/drafts",
  asyncRoute(async (req, res) => {
    const payload = draftSchema.parse(req.body);
    const invoice = await createInvoiceDraftFromWorkDays({
      clientId: payload.clientId,
      contractId: payload.contractId ?? null,
      startDate: parseDateString(payload.startDate),
      endDate: parseDateString(payload.endDate),
      issueDate: payload.issueDate ? parseDateString(payload.issueDate) : undefined,
      notes: payload.notes ?? null
    });

    const fullInvoice = await prisma.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
      include: { lines: true, client: true, contract: true, userProfile: true }
    });

    res.status(201).json({
      ...serializeInvoice(fullInvoice),
      client: fullInvoice.client,
      contract: fullInvoice.contract ? { id: fullInvoice.contract.id, title: fullInvoice.contract.title } : null,
      userProfile: fullInvoice.userProfile
    });
  })
);

router.put(
  "/:id",
  asyncRoute(async (req, res) => {
    const payload = invoiceUpdateSchema.parse(req.body);
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        status: payload.status,
        notes: payload.notes ?? undefined,
        issueDate: payload.issueDate ? parseDateString(payload.issueDate) : undefined,
        servicePeriodStart: payload.servicePeriodStart ? parseDateString(payload.servicePeriodStart) : undefined,
        servicePeriodEnd: payload.servicePeriodEnd ? parseDateString(payload.servicePeriodEnd) : undefined,
        paymentTermsDays: payload.paymentTermsDays,
        latePaymentRate: payload.latePaymentRate === undefined ? undefined : toDecimal(payload.latePaymentRate),
        recoveryChargeAmount:
          payload.recoveryChargeAmount === undefined ? undefined : toDecimal(payload.recoveryChargeAmount),
        vatMode: payload.vatMode,
        vatRate: payload.vatRate === undefined ? undefined : toDecimal(payload.vatRate)
      },
      include: { lines: true, client: true, contract: true, userProfile: true }
    });

    await recalculateInvoiceTotals(invoice.id);

    const refreshed = await prisma.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
      include: { lines: true, client: true, contract: true, userProfile: true }
    });

    res.json({
      ...serializeInvoice(refreshed),
      client: refreshed.client,
      contract: refreshed.contract ? { id: refreshed.contract.id, title: refreshed.contract.title } : null,
      userProfile: refreshed.userProfile
    });
  })
);

router.delete(
  "/:id",
  asyncRoute(async (req, res) => {
    await prisma.invoice.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

router.post(
  "/:invoiceId/lines",
  asyncRoute(async (req, res) => {
    const payload = lineSchema.parse(req.body);
    const line = await prisma.invoiceLine.create({
      data: {
        invoiceId: req.params.invoiceId,
        description: payload.description,
        quantityDays: toDecimal(payload.quantityDays),
        unitPrice: toDecimal(payload.unitPrice),
        total: toDecimal(payload.quantityDays * payload.unitPrice),
        sortOrder: payload.sortOrder ?? 0
      }
    });
    await recalculateInvoiceTotals(req.params.invoiceId);
    res.status(201).json(serializeInvoiceLine(line));
  })
);

router.put(
  "/lines/:lineId",
  asyncRoute(async (req, res) => {
    const payload = lineSchema.parse(req.body);
    const line = await prisma.invoiceLine.update({
      where: { id: req.params.lineId },
      data: {
        description: payload.description,
        quantityDays: toDecimal(payload.quantityDays),
        unitPrice: toDecimal(payload.unitPrice),
        total: toDecimal(payload.quantityDays * payload.unitPrice),
        sortOrder: payload.sortOrder ?? 0
      }
    });
    await recalculateInvoiceTotals(line.invoiceId);
    res.json(serializeInvoiceLine(line));
  })
);

router.delete(
  "/lines/:lineId",
  asyncRoute(async (req, res) => {
    const existing = await prisma.invoiceLine.findUnique({ where: { id: req.params.lineId } });
    await prisma.invoiceLine.delete({ where: { id: req.params.lineId } });
    if (existing) {
      await recalculateInvoiceTotals(existing.invoiceId);
    }
    res.status(204).end();
  })
);

router.get(
  "/:id/pdf",
  asyncRoute(async (req, res) => {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        lines: { orderBy: { sortOrder: "asc" } },
        client: true,
        userProfile: true
      }
    });
    if (!invoice) {
      throw new AppError(404, "Invoice not found");
    }

    const settings = await ensureInvoiceSettings();
    const pdfBuffer = await buildInvoicePdfBuffer({ invoice, settings });
    res.setHeader("Content-Type", "application/pdf");
    const download = req.query.download === "1" || req.query.download === "true";
    res.setHeader(
      "Content-Disposition",
      `${download ? "attachment" : "inline"}; filename="${invoice.invoiceNumber}.pdf"`
    );
    res.send(pdfBuffer);
  })
);

export default router;

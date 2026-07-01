import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncRoute } from "../lib/http.js";
import { ensureWorkspaceProfile } from "../lib/workspace.js";
import { AppError } from "../lib/errors.js";
import { parseDateString, parseMonthKey } from "../lib/dates.js";
import { toDecimal } from "../lib/number.js";
import { serializePaymentLog } from "../lib/serializers.js";

const router = Router();

const paymentSchema = z.object({
  kind: z.enum(["INVOICE_PAYMENT", "CLIENT_DEPOSIT", "OTHER"]),
  title: z.string().min(1),
  amount: z.number().min(0),
  currency: z.string().min(1).default("EUR"),
  receivedAt: z.string().min(1),
  method: z.string().nullable().optional(),
  invoiceId: z.string().nullable().optional(),
  clientId: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});

const listQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

router.get(
  "/",
  asyncRoute(async (req, res) => {
    const profile = await ensureWorkspaceProfile();
    const query = listQuerySchema.parse({
      month: typeof req.query.month === "string" ? req.query.month : undefined,
      limit: req.query.limit
    });

    const monthRange = query.month ? parseMonthKey(query.month) : null;
    const payments = await prisma.paymentLog.findMany({
      where: {
        userProfileId: profile.id,
        ...(monthRange
          ? {
              receivedAt: {
                gte: monthRange.start,
                lte: monthRange.end
              }
            }
          : {})
      },
      include: {
        client: true,
        invoice: true
      },
      orderBy: { receivedAt: "desc" },
      take: query.limit
    });

    res.json(payments.map(serializePaymentLog));
  })
);

router.post(
  "/",
  asyncRoute(async (req, res) => {
    const profile = await ensureWorkspaceProfile();
    const payload = paymentSchema.parse(req.body);
    const payment = await prisma.paymentLog.create({
      data: {
        userProfileId: profile.id,
        kind: payload.kind,
        title: payload.title,
        amount: toDecimal(payload.amount),
        currency: payload.currency,
        receivedAt: parseDateString(payload.receivedAt.slice(0, 10)),
        method: payload.method ?? null,
        invoiceId: payload.invoiceId ?? null,
        clientId: payload.clientId ?? null,
        notes: payload.notes ?? null
      },
      include: {
        client: true,
        invoice: true
      }
    });

    res.status(201).json(serializePaymentLog(payment));
  })
);

router.put(
  "/:id",
  asyncRoute(async (req, res) => {
    const existing = await prisma.paymentLog.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw new AppError(404, "Payment log not found");
    }

    const payload = paymentSchema.parse(req.body);
    const payment = await prisma.paymentLog.update({
      where: { id: req.params.id },
      data: {
        kind: payload.kind,
        title: payload.title,
        amount: toDecimal(payload.amount),
        currency: payload.currency,
        receivedAt: parseDateString(payload.receivedAt.slice(0, 10)),
        method: payload.method ?? null,
        invoiceId: payload.invoiceId ?? null,
        clientId: payload.clientId ?? null,
        notes: payload.notes ?? null
      },
      include: {
        client: true,
        invoice: true
      }
    });

    res.json(serializePaymentLog(payment));
  })
);

router.delete(
  "/:id",
  asyncRoute(async (req, res) => {
    const existing = await prisma.paymentLog.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw new AppError(404, "Payment log not found");
    }

    await prisma.paymentLog.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

export default router;

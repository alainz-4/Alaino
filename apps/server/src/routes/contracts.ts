import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncRoute } from "../lib/http.js";
import { ensureWorkspaceProfile } from "../lib/workspace.js";
import { serializeContract } from "../lib/serializers.js";
import { AppError } from "../lib/errors.js";
import { parseDateString } from "../lib/dates.js";
import { toDecimal } from "../lib/number.js";

const router = Router();

const contractSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().min(1),
  paymentType: z.enum(["DAILY", "RETAINER", "FIXED"]),
  startDate: z.string().min(1),
  endDate: z.string().nullable().optional(),
  dailyRate: z.number().nullable().optional(),
  monthlyRetainerAmount: z.number().nullable().optional(),
  fixedProjectAmount: z.number().nullable().optional(),
  fixedProjectDate: z.string().nullable().optional(),
  billingDayOfMonth: z.number().int().nullable().optional(),
  active: z.boolean(),
  notes: z.string().nullable().optional()
});

router.get(
  "/",
  asyncRoute(async (_req, res) => {
    const profile = await ensureWorkspaceProfile();
    const contracts = await prisma.contract.findMany({
      where: { userProfileId: profile.id },
      include: { client: true },
      orderBy: { createdAt: "desc" }
    });
    res.json(contracts.map((contract) => ({ ...serializeContract(contract), client: contract.client })));
  })
);

router.post(
  "/",
  asyncRoute(async (req, res) => {
    const profile = await ensureWorkspaceProfile();
    const payload = contractSchema.parse(req.body);
    const client = await prisma.client.findUnique({ where: { id: payload.clientId } });
    if (!client) {
      throw new AppError(404, "Client not found");
    }
    const contract = await prisma.contract.create({
      data: {
        userProfileId: profile.id,
        clientId: payload.clientId,
        title: payload.title,
        paymentType: payload.paymentType,
        startDate: parseDateString(payload.startDate),
        endDate: payload.endDate ? parseDateString(payload.endDate) : null,
        dailyRate: payload.dailyRate === undefined || payload.dailyRate === null ? null : toDecimal(payload.dailyRate),
        monthlyRetainerAmount:
          payload.monthlyRetainerAmount === undefined || payload.monthlyRetainerAmount === null
            ? null
            : toDecimal(payload.monthlyRetainerAmount),
        fixedProjectAmount:
          payload.fixedProjectAmount === undefined || payload.fixedProjectAmount === null
            ? null
            : toDecimal(payload.fixedProjectAmount),
        fixedProjectDate: payload.fixedProjectDate ? parseDateString(payload.fixedProjectDate) : null,
        billingDayOfMonth: payload.billingDayOfMonth ?? null,
        active: payload.active,
        notes: payload.notes ?? null
      },
      include: { client: true }
    });
    res.status(201).json({ ...serializeContract(contract), client: contract.client });
  })
);

router.get(
  "/:id",
  asyncRoute(async (req, res) => {
    const contract = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: { client: true }
    });
    if (!contract) {
      throw new AppError(404, "Contract not found");
    }
    res.json({ ...serializeContract(contract), client: contract.client });
  })
);

router.put(
  "/:id",
  asyncRoute(async (req, res) => {
    const payload = contractSchema.parse(req.body);
    const contract = await prisma.contract.update({
      where: { id: req.params.id },
      data: {
        clientId: payload.clientId,
        title: payload.title,
        paymentType: payload.paymentType,
        startDate: parseDateString(payload.startDate),
        endDate: payload.endDate ? parseDateString(payload.endDate) : null,
        dailyRate: payload.dailyRate === undefined || payload.dailyRate === null ? null : toDecimal(payload.dailyRate),
        monthlyRetainerAmount:
          payload.monthlyRetainerAmount === undefined || payload.monthlyRetainerAmount === null
            ? null
            : toDecimal(payload.monthlyRetainerAmount),
        fixedProjectAmount:
          payload.fixedProjectAmount === undefined || payload.fixedProjectAmount === null
            ? null
            : toDecimal(payload.fixedProjectAmount),
        fixedProjectDate: payload.fixedProjectDate ? parseDateString(payload.fixedProjectDate) : null,
        billingDayOfMonth: payload.billingDayOfMonth ?? null,
        active: payload.active,
        notes: payload.notes ?? null
      },
      include: { client: true }
    });
    res.json({ ...serializeContract(contract), client: contract.client });
  })
);

router.delete(
  "/:id",
  asyncRoute(async (req, res) => {
    await prisma.contract.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

export default router;

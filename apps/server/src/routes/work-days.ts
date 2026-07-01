import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncRoute } from "../lib/http.js";
import { ensureWorkspaceProfile, ensureFreelanceSettings } from "../lib/workspace.js";
import { serializeWorkDay } from "../lib/serializers.js";
import { AppError } from "../lib/errors.js";
import { parseDateString, parseMonthKey, toDateOnly } from "../lib/dates.js";
import { toDecimal } from "../lib/number.js";

const router = Router();

const workDaySchema = z.object({
  status: z.enum(["WORKING", "OFF"]),
  contractId: z.string().nullable().optional(),
  clientId: z.string().nullable().optional(),
  dailyRate: z.number().nullable().optional(),
  notes: z.string().nullable().optional()
});

const bulkWorkDaySchema = workDaySchema.extend({
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1)
});

router.get(
  "/",
  asyncRoute(async (req, res) => {
    const monthKey = z.string().regex(/^\d{4}-\d{2}$/).parse(String(req.query.month ?? ""));
    const profile = await ensureWorkspaceProfile();
    const range = parseMonthKey(monthKey);
    const workDays = await prisma.workDay.findMany({
      where: {
        userProfileId: profile.id,
        workDate: { gte: range.start, lte: range.end }
      },
      include: {
        contract: true,
        client: true
      }
    });
    res.json(
      workDays.map((day) => ({
        ...serializeWorkDay(day),
        contract: day.contract ? { id: day.contract.id, title: day.contract.title } : null,
        client: day.client ? { id: day.client.id, name: day.client.name } : null
      }))
    );
  })
);

router.put(
  "/bulk",
  asyncRoute(async (req, res) => {
    const profile = await ensureWorkspaceProfile();
    const payload = bulkWorkDaySchema.parse(req.body);
    const dates = Array.from(new Set(payload.dates)).map(parseDateString);

    if (payload.status === "WORKING" && !payload.contractId) {
      throw new AppError(400, "A contract is required for working days");
    }

    let contractRecord: Awaited<ReturnType<typeof prisma.contract.findUnique>> = null;
    if (payload.contractId) {
      contractRecord = await prisma.contract.findUnique({ where: { id: payload.contractId } });
      if (!contractRecord) {
        throw new AppError(404, "Contract not found");
      }
      if (!payload.clientId) {
        payload.clientId = contractRecord.clientId;
      }
    }

    const freelanceSettings = await ensureFreelanceSettings();
    const resolvedRate =
      payload.status === "OFF"
        ? null
        : payload.dailyRate === undefined || payload.dailyRate === null
          ? contractRecord?.dailyRate ?? freelanceSettings.defaultDailyRate
          : toDecimal(payload.dailyRate);

    await prisma.$transaction(
      dates.map((workDate) =>
        prisma.workDay.upsert({
          where: {
            userProfileId_workDate: {
              userProfileId: profile.id,
              workDate
            }
          },
          create: {
            userProfileId: profile.id,
            workDate,
            status: payload.status,
            contractId: payload.status === "OFF" ? null : payload.contractId ?? null,
            clientId: payload.status === "OFF" ? null : payload.clientId ?? null,
            dailyRate: resolvedRate,
            notes: payload.notes ?? null
          },
          update: {
            status: payload.status,
            contractId: payload.status === "OFF" ? null : payload.contractId ?? null,
            clientId: payload.status === "OFF" ? null : payload.clientId ?? null,
            dailyRate: resolvedRate,
            notes: payload.notes ?? null
          }
        })
      )
    );

    res.status(204).end();
  })
);

router.get(
  "/:date",
  asyncRoute(async (req, res) => {
    const profile = await ensureWorkspaceProfile();
    const workDate = parseDateString(req.params.date);
    const day = await prisma.workDay.findUnique({
      where: {
        userProfileId_workDate: {
          userProfileId: profile.id,
          workDate
        }
      },
      include: { contract: true, client: true }
    });

    if (!day) {
      throw new AppError(404, "Work day not found");
    }

    res.json({
      ...serializeWorkDay(day),
      contract: day.contract ? { id: day.contract.id, title: day.contract.title } : null,
      client: day.client ? { id: day.client.id, name: day.client.name } : null
    });
  })
);

router.put(
  "/:date",
  asyncRoute(async (req, res) => {
    const profile = await ensureWorkspaceProfile();
    const payload = workDaySchema.parse(req.body);
    const workDate = parseDateString(req.params.date);

    if (payload.status === "WORKING" && !payload.contractId) {
      throw new AppError(400, "A contract is required for working days");
    }

    let contractRecord: Awaited<ReturnType<typeof prisma.contract.findUnique>> = null;
    if (payload.contractId) {
      contractRecord = await prisma.contract.findUnique({ where: { id: payload.contractId } });
      if (!contractRecord) {
        throw new AppError(404, "Contract not found");
      }
      if (!payload.clientId) {
        payload.clientId = contractRecord.clientId;
      }
    }

    const freelanceSettings = await ensureFreelanceSettings();
    const resolvedRate =
      payload.status === "OFF"
        ? null
        : payload.dailyRate === undefined || payload.dailyRate === null
          ? contractRecord?.dailyRate ?? freelanceSettings.defaultDailyRate
          : toDecimal(payload.dailyRate);

    const existing = await prisma.workDay.findUnique({
      where: {
        userProfileId_workDate: {
          userProfileId: profile.id,
          workDate
        }
      }
    });

    const data = {
      userProfileId: profile.id,
      workDate,
      status: payload.status,
      contractId: payload.status === "OFF" ? null : payload.contractId ?? null,
      clientId: payload.status === "OFF" ? null : payload.clientId ?? null,
      dailyRate: resolvedRate,
      notes: payload.notes ?? null
    };

    const workDay = existing
      ? await prisma.workDay.update({
          where: { id: existing.id },
          data
        })
      : await prisma.workDay.create({
          data
        });

    res.json(serializeWorkDay(workDay));
  })
);

router.delete(
  "/:date",
  asyncRoute(async (req, res) => {
    const profile = await ensureWorkspaceProfile();
    const workDate = parseDateString(req.params.date);
    const existing = await prisma.workDay.findUnique({
      where: {
        userProfileId_workDate: {
          userProfileId: profile.id,
          workDate
        }
      }
    });
    if (!existing) {
      throw new AppError(404, "Work day not found");
    }
    await prisma.workDay.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);

export default router;

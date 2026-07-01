import { Router } from "express";
import { asyncRoute } from "../lib/http.js";
import { ensureWorkspaceProfile } from "../lib/workspace.js";
import { parseMonthKey, toDateOnly } from "../lib/dates.js";
import { prisma } from "../lib/prisma.js";
import { buildDashboardSummary } from "../lib/dashboard.js";
import { serializeWorkDay } from "../lib/serializers.js";

const router = Router();

router.get(
  "/:monthKey",
  asyncRoute(async (req, res) => {
    const monthKey = req.params.monthKey;
    const profile = await ensureWorkspaceProfile();
    const range = parseMonthKey(monthKey);
    const [summary, workDays] = await Promise.all([
      buildDashboardSummary(monthKey),
      prisma.workDay.findMany({
        where: {
          userProfileId: profile.id,
          workDate: { gte: range.start, lte: range.end }
        },
        include: { contract: true, client: true }
      })
    ]);

    const byDate = new Map(workDays.map((day) => [toDateOnly(day.workDate), day]));
    const days: Array<Record<string, unknown>> = [];

    for (let day = range.start; day <= range.end; day = new Date(day.getTime() + 24 * 60 * 60 * 1000)) {
      const dateKey = toDateOnly(day);
      const found = byDate.get(dateKey);
      if (found) {
        days.push({
          ...serializeWorkDay(found),
          contract: found.contract ? { id: found.contract.id, title: found.contract.title } : null,
          client: found.client ? { id: found.client.id, name: found.client.name } : null
        });
      } else {
        days.push({
          id: dateKey,
          userProfileId: profile.id,
          clientId: null,
          contractId: null,
          invoiceId: null,
          workDate: dateKey,
          status: "OFF",
          dailyRate: null,
          notes: null,
          createdAt: null,
          updatedAt: null,
          contract: null,
          client: null
        });
      }
    }

    res.json({
      month: monthKey,
      days,
      projection: summary
    });
  })
);

export default router;

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncRoute } from "../lib/http.js";
import { ensureWorkspaceProfile } from "../lib/workspace.js";
import { AppError } from "../lib/errors.js";
import { buildDashboardSummary } from "../lib/dashboard.js";
import { parseDateString } from "../lib/dates.js";
import { toDecimal } from "../lib/number.js";
import { serializeExpense } from "../lib/serializers.js";
import { buildExpenseAlerts, forecastExpenseMonths } from "@freelance/shared";

const router = Router();

const expenseSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  amount: z.number().min(0),
  dueDate: z.string().min(1),
  recurrence: z.enum(["ONE_TIME", "MONTHLY"]),
  status: z.enum(["PLANNED", "PAID"]),
  notes: z.string().nullable().optional()
});

const summaryQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  horizon: z.coerce.number().int().min(1).max(12).default(3)
});

router.get(
  "/",
  asyncRoute(async (_req, res) => {
    const profile = await ensureWorkspaceProfile();
    const expenses = await prisma.expense.findMany({
      where: { userProfileId: profile.id },
      orderBy: { dueDate: "asc" }
    });

    res.json(expenses.map(serializeExpense));
  })
);

router.get(
  "/summary",
  asyncRoute(async (req, res) => {
    const profile = await ensureWorkspaceProfile();
    const query = summaryQuerySchema.parse({
      month: String(req.query.month ?? ""),
      horizon: req.query.horizon
    });

    const expenses = await prisma.expense.findMany({
      where: { userProfileId: profile.id },
      orderBy: { dueDate: "asc" }
    });

    const forecast = forecastExpenseMonths(
      expenses.map((expense) => ({
        title: expense.title,
        category: expense.category,
        amount: Number(expense.amount),
        dueDate: expense.dueDate.toISOString().slice(0, 10),
        recurrence: expense.recurrence as "ONE_TIME" | "MONTHLY",
        status: expense.status as "PLANNED" | "PAID"
      })),
      query.month,
      query.horizon
    );
    const alerts = buildExpenseAlerts(
      expenses.map((expense) => ({
        title: expense.title,
        category: expense.category,
        amount: Number(expense.amount),
        dueDate: expense.dueDate.toISOString().slice(0, 10),
        recurrence: expense.recurrence as "ONE_TIME" | "MONTHLY",
        status: expense.status as "PLANNED" | "PAID"
      })),
      query.month,
      14
    );

    const current = forecast[0] ?? { month: query.month, planned: 0, paid: 0, total: 0 };
    const nextMonths = forecast.slice(1);
    const monthlyGoalPlan = (await buildDashboardSummary(query.month)).monthlyGoalPlan;

    res.json({
      month: query.month,
      horizonMonths: query.horizon,
      currentMonth: current,
      forecast,
      expenses: expenses.map(serializeExpense),
      alerts,
      totals: {
        planned: forecast.reduce((sum, item) => sum + item.planned, 0),
        paid: forecast.reduce((sum, item) => sum + item.paid, 0),
        total: forecast.reduce((sum, item) => sum + item.total, 0)
      },
      monthlyGoalPlan,
      nextMonths
    });
  })
);

router.post(
  "/",
  asyncRoute(async (req, res) => {
    const profile = await ensureWorkspaceProfile();
    const payload = expenseSchema.parse(req.body);
    const expense = await prisma.expense.create({
      data: {
        userProfileId: profile.id,
        title: payload.title,
        category: payload.category,
        amount: toDecimal(payload.amount),
        dueDate: parseDateString(payload.dueDate),
        recurrence: payload.recurrence,
        status: payload.status,
        notes: payload.notes ?? null
      }
    });

    res.status(201).json(serializeExpense(expense));
  })
);

router.put(
  "/:id",
  asyncRoute(async (req, res) => {
    const payload = expenseSchema.parse(req.body);
    const existing = await prisma.expense.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw new AppError(404, "Expense not found");
    }

    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: {
        title: payload.title,
        category: payload.category,
        amount: toDecimal(payload.amount),
        dueDate: parseDateString(payload.dueDate),
        recurrence: payload.recurrence,
        status: payload.status,
        notes: payload.notes ?? null
      }
    });

    res.json(serializeExpense(expense));
  })
);

router.delete(
  "/:id",
  asyncRoute(async (req, res) => {
    const existing = await prisma.expense.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw new AppError(404, "Expense not found");
    }

    await prisma.expense.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

export default router;

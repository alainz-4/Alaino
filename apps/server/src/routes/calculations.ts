import { Router } from "express";
import { z } from "zod";
import {
  buildCashflowScenarios,
  calculateMonthlyGoalPlan,
  calculateBudgetRecommendation,
  calculateEmergencyFundTarget,
  calculateMinDailyRate,
  calculateRequiredWorkingDays
} from "@freelance/shared";
import { asyncRoute } from "../lib/http.js";

const router = Router();

const planningSchema = z.object({
  projectedIncome: z.number().min(0),
  requiredMonthlyIncome: z.number().min(0),
  dailyRate: z.number().min(0).default(0),
  workingDays: z.number().int().min(0).default(0),
  essentials: z.number().min(0),
  wants: z.number().min(0),
  savingsGoalMonthly: z.number().min(0),
  currentReserves: z.number().min(0),
  emergencyFundMonths: z.number().int().min(1).default(6),
  expensesThisMonth: z.number().min(0).default(0),
  nextThreeMonthsExpenses: z.number().min(0).default(0),
  urssafReservePercent: z.number().min(0).default(25.6),
  incomeTaxReservePercent: z.number().min(0).default(2.2),
  extraExpense: z.number().min(0).default(0),
  incomeShockPercent: z.number().min(0).max(100).default(10),
  extraDaysOff: z.number().int().min(0).default(2)
});

router.post(
  "/emergency-fund",
  asyncRoute(async (req, res) => {
    const payload = z.object({
      essentialExpenses: z.number().min(0),
      desiredMonths: z.number().int().min(1).default(6)
    }).parse(req.body);
    res.json({
      target: calculateEmergencyFundTarget(payload.essentialExpenses, payload.desiredMonths)
    });
  })
);

router.post(
  "/budget-split",
  asyncRoute(async (req, res) => {
    const payload = z.object({
      monthlyIncome: z.number().min(0),
      needsPercent: z.number().min(0).max(100).default(50),
      wantsPercent: z.number().min(0).max(100).default(30),
      savingsPercent: z.number().min(0).max(100).default(20)
    }).parse(req.body);
    res.json({
      recommendation: calculateBudgetRecommendation(payload.monthlyIncome, {
        needsPercent: payload.needsPercent,
        wantsPercent: payload.wantsPercent,
        savingsPercent: payload.savingsPercent
      })
    });
  })
);

router.post(
  "/daily-rate",
  asyncRoute(async (req, res) => {
    const payload = z.object({
      requiredMonthlyIncome: z.number().min(0),
      workingDays: z.number().int().min(1)
    }).parse(req.body);
    res.json({
      minimumDailyRate: calculateMinDailyRate(payload.requiredMonthlyIncome, payload.workingDays)
    });
  })
);

router.post(
  "/working-days",
  asyncRoute(async (req, res) => {
    const payload = z.object({
      requiredMonthlyIncome: z.number().min(0),
      dailyRate: z.number().min(0)
    }).parse(req.body);
    res.json({
      requiredWorkingDays: calculateRequiredWorkingDays(payload.requiredMonthlyIncome, payload.dailyRate)
    });
  })
);

router.post(
  "/planning",
  asyncRoute(async (req, res) => {
    const payload = planningSchema.parse(req.body);
    const goalPlan = calculateMonthlyGoalPlan({
      projectedIncome: payload.projectedIncome,
      essentials: payload.essentials,
      wants: payload.wants,
      savingsGoalMonthly: payload.savingsGoalMonthly,
      currentReserves: payload.currentReserves,
      emergencyFundMonths: payload.emergencyFundMonths,
      expensesThisMonth: payload.expensesThisMonth,
      nextThreeMonthsExpenses: payload.nextThreeMonthsExpenses,
      urssafReservePercent: payload.urssafReservePercent,
      incomeTaxReservePercent: payload.incomeTaxReservePercent
    });

    res.json({
      goalPlan,
      scenarios: buildCashflowScenarios({
        baseProjectedIncome: payload.projectedIncome,
        safeToSpend: goalPlan.flexibleSpendingCap,
        requiredMonthlyIncome: payload.requiredMonthlyIncome,
        dailyRate: payload.dailyRate,
        workingDays: payload.workingDays,
        extraExpense: payload.extraExpense,
        incomeShockPercent: payload.incomeShockPercent,
        extraDaysOff: payload.extraDaysOff
      })
    });
  })
);

export default router;

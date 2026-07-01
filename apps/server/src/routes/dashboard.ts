import { Router } from "express";
import { asyncRoute } from "../lib/http.js";
import { buildDashboardSummary } from "../lib/dashboard.js";

const router = Router();

router.get(
  "/summary",
  asyncRoute(async (req, res) => {
    const month = typeof req.query.month === "string" && /^\d{4}-\d{2}$/.test(req.query.month) ? req.query.month : new Date().toISOString().slice(0, 7);
    const summary = await buildDashboardSummary(month);
    res.json(summary);
  })
);

export default router;

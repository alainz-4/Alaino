import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { uploadsRoot } from "./lib/uploads.js";
import { handleError } from "./lib/http.js";
import settingsRouter from "./routes/settings.js";
import clientsRouter from "./routes/clients.js";
import contractsRouter from "./routes/contracts.js";
import workDaysRouter from "./routes/work-days.js";
import invoicesRouter from "./routes/invoices.js";
import calculationsRouter from "./routes/calculations.js";
import calendarRouter from "./routes/calendar.js";
import dashboardRouter from "./routes/dashboard.js";
import expensesRouter from "./routes/expenses.js";
import paymentsRouter from "./routes/payments.js";
import assistantRouter from "./routes/assistant.js";

export function createApp() {
  const app = express();
  const webDistRoot = resolveWebDistRoot();
  const webIndexPath = path.join(webDistRoot, "index.html");
  const hasWebBuild = fs.existsSync(webIndexPath);

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  if (hasWebBuild) {
    app.use(express.static(webDistRoot, { index: false, maxAge: "1h" }));
  }
  app.use("/uploads", express.static(uploadsRoot));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/settings", settingsRouter);
  app.use("/api/clients", clientsRouter);
  app.use("/api/contracts", contractsRouter);
  app.use("/api/work-days", workDaysRouter);
  app.use("/api/invoices", invoicesRouter);
  app.use("/api/calculations", calculationsRouter);
  app.use("/api/calendar", calendarRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/expenses", expensesRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/assistant", assistantRouter);

  if (hasWebBuild) {
    app.get("*", (req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") {
        next();
        return;
      }

      if (req.path.startsWith("/api") || req.path.startsWith("/uploads") || req.path === "/health") {
        next();
        return;
      }

      if (path.extname(req.path)) {
        res.status(404).end();
        return;
      }

      res.sendFile(webIndexPath, (error) => {
        if (error) {
          next(error);
        }
      });
    });
  }

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    handleError(error, res);
  });

  return app;
}

function resolveWebDistRoot() {
  const candidates = [
    path.resolve(process.cwd(), "../web/dist"),
    path.resolve(process.cwd(), "../../web/dist"),
    path.resolve(process.cwd(), "apps/web/dist")
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
import AdmZip from "adm-zip";
import {
  Prisma,
  PrismaClient,
  type AssistantConversation,
  type AssistantMessage,
  type Client,
  type Contract,
  type Expense,
  type FinanceSettings,
  type FreelanceSettings,
  type GoogleDriveConnection,
  type Invoice,
  type InvoiceLine,
  type InvoiceSettings,
  type PaymentLog,
  type UserProfile,
  type WorkDay
} from "@prisma/client";
import { prisma } from "./prisma.js";
import { AppError } from "./errors.js";
import { env } from "../env.js";
import { uploadsRoot, ensureUploadDirs } from "./uploads.js";

const require = createRequire(import.meta.url);
const archiver = require("archiver") as typeof import("archiver");

export type WorkspaceSnapshot = {
  userProfiles: UserProfile[];
  freelanceSettings: FreelanceSettings[];
  financeSettings: FinanceSettings[];
  invoiceSettings: InvoiceSettings[];
  googleDriveConnections: GoogleDriveConnection[];
  clients: Client[];
  contracts: Contract[];
  invoices: Invoice[];
  invoiceLines: InvoiceLine[];
  workDays: WorkDay[];
  expenses: Expense[];
  assistantConversations: AssistantConversation[];
  assistantMessages: AssistantMessage[];
  paymentLogs: PaymentLog[];
};

export type WorkspaceSnapshotLike = {
  [K in keyof WorkspaceSnapshot]: Array<Record<string, unknown>>;
};

const SNAPSHOT_DATE_FIELDS: { [K in keyof WorkspaceSnapshot]: readonly string[] } = {
  userProfiles: ["createdAt", "updatedAt"],
  freelanceSettings: ["createdAt", "updatedAt"],
  financeSettings: ["createdAt", "updatedAt"],
  invoiceSettings: ["createdAt", "updatedAt"],
  googleDriveConnections: ["connectedAt", "oauthStateExpiresAt", "createdAt", "updatedAt"],
  clients: ["createdAt", "updatedAt"],
  contracts: ["startDate", "endDate", "fixedProjectDate", "createdAt", "updatedAt"],
  invoices: ["issueDate", "servicePeriodStart", "servicePeriodEnd", "paidAt", "dueDate", "createdAt", "updatedAt"],
  invoiceLines: ["createdAt", "updatedAt"],
  workDays: ["workDate", "createdAt", "updatedAt"],
  expenses: ["dueDate", "createdAt", "updatedAt"],
  assistantConversations: ["lastMessageAt", "createdAt", "updatedAt"],
  assistantMessages: ["createdAt"],
  paymentLogs: ["receivedAt", "createdAt", "updatedAt"]
};

function isPostgresDatabaseUrl(databaseUrl: string) {
  return /^postgres(?:ql)?:\/\//i.test(databaseUrl);
}

function reviveDate(value: unknown) {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    return new Date(value);
  }

  return value;
}

function normalizeSnapshot(snapshot: WorkspaceSnapshotLike): WorkspaceSnapshotLike {
  const normalized = {} as WorkspaceSnapshotLike;

  for (const [modelName, records] of Object.entries(snapshot) as Array<[keyof WorkspaceSnapshotLike, Array<Record<string, unknown>>]>) {
    const dateFields = SNAPSHOT_DATE_FIELDS[modelName];
    normalized[modelName] = records.map((record) => {
      const normalizedRecord: Record<string, unknown> = { ...record };
      for (const field of dateFields) {
        if (field in normalizedRecord) {
          normalizedRecord[field] = reviveDate(normalizedRecord[field]);
        }
      }
      return normalizedRecord;
    });
  }

  return normalized;
}

async function readWorkspaceSnapshot(db: any): Promise<WorkspaceSnapshotLike> {
  return {
    userProfiles: await db.userProfile.findMany(),
    freelanceSettings: await db.freelanceSettings.findMany(),
    financeSettings: await db.financeSettings.findMany(),
    invoiceSettings: await db.invoiceSettings.findMany(),
    googleDriveConnections: await db.googleDriveConnection.findMany(),
    clients: await db.client.findMany(),
    contracts: await db.contract.findMany(),
    invoices: await db.invoice.findMany(),
    invoiceLines: await db.invoiceLine.findMany(),
    workDays: await db.workDay.findMany(),
    expenses: await db.expense.findMany(),
    assistantConversations: await db.assistantConversation.findMany(),
    assistantMessages: await db.assistantMessage.findMany(),
    paymentLogs: await db.paymentLog.findMany()
  };
}

export async function writeWorkspaceSnapshotToTarget(db: any, snapshot: WorkspaceSnapshotLike) {
  const normalized = normalizeSnapshot(snapshot);

  const operations: Array<ReturnType<typeof db.$transaction>[number]> = [];

  operations.push(
    db.assistantMessage.deleteMany(),
    db.assistantConversation.deleteMany(),
    db.paymentLog.deleteMany(),
    db.invoiceLine.deleteMany(),
    db.workDay.deleteMany(),
    db.invoice.deleteMany(),
    db.contract.deleteMany(),
    db.client.deleteMany(),
    db.expense.deleteMany(),
    db.googleDriveConnection.deleteMany(),
    db.invoiceSettings.deleteMany(),
    db.financeSettings.deleteMany(),
    db.freelanceSettings.deleteMany(),
    db.userProfile.deleteMany()
  );

  if (normalized.userProfiles.length > 0) {
    operations.push(db.userProfile.createMany({ data: normalized.userProfiles as Prisma.UserProfileCreateManyInput[] }));
  }
  if (normalized.freelanceSettings.length > 0) {
    operations.push(
      db.freelanceSettings.createMany({ data: normalized.freelanceSettings as Prisma.FreelanceSettingsCreateManyInput[] })
    );
  }
  if (normalized.financeSettings.length > 0) {
    operations.push(db.financeSettings.createMany({ data: normalized.financeSettings as Prisma.FinanceSettingsCreateManyInput[] }));
  }
  if (normalized.invoiceSettings.length > 0) {
    operations.push(db.invoiceSettings.createMany({ data: normalized.invoiceSettings as Prisma.InvoiceSettingsCreateManyInput[] }));
  }
  if (normalized.googleDriveConnections.length > 0) {
    operations.push(
      db.googleDriveConnection.createMany({ data: normalized.googleDriveConnections as Prisma.GoogleDriveConnectionCreateManyInput[] })
    );
  }
  if (normalized.clients.length > 0) {
    operations.push(db.client.createMany({ data: normalized.clients as Prisma.ClientCreateManyInput[] }));
  }
  if (normalized.contracts.length > 0) {
    operations.push(db.contract.createMany({ data: normalized.contracts as Prisma.ContractCreateManyInput[] }));
  }
  if (normalized.invoices.length > 0) {
    operations.push(db.invoice.createMany({ data: normalized.invoices as Prisma.InvoiceCreateManyInput[] }));
  }
  if (normalized.invoiceLines.length > 0) {
    operations.push(db.invoiceLine.createMany({ data: normalized.invoiceLines as Prisma.InvoiceLineCreateManyInput[] }));
  }
  if (normalized.workDays.length > 0) {
    operations.push(db.workDay.createMany({ data: normalized.workDays as Prisma.WorkDayCreateManyInput[] }));
  }
  if (normalized.expenses.length > 0) {
    operations.push(db.expense.createMany({ data: normalized.expenses as Prisma.ExpenseCreateManyInput[] }));
  }
  if (normalized.assistantConversations.length > 0) {
    operations.push(
      db.assistantConversation.createMany({
        data: normalized.assistantConversations as Prisma.AssistantConversationCreateManyInput[]
      })
    );
  }
  if (normalized.assistantMessages.length > 0) {
    operations.push(db.assistantMessage.createMany({ data: normalized.assistantMessages as Prisma.AssistantMessageCreateManyInput[] }));
  }
  if (normalized.paymentLogs.length > 0) {
    operations.push(db.paymentLog.createMany({ data: normalized.paymentLogs as Prisma.PaymentLogCreateManyInput[] }));
  }

  await db.$transaction(operations);
}

export async function importSqliteDatabaseToTarget(extractedDatabasePath: string) {
  const sourcePrisma = new PrismaClient({
    datasources: {
      db: {
        url: pathToFileURL(extractedDatabasePath).href
      }
    }
  });

  try {
    const snapshot = await readWorkspaceSnapshot(sourcePrisma);
    await writeWorkspaceSnapshotToTarget(prisma, snapshot);
  } finally {
    await sourcePrisma.$disconnect();
  }
}

function zipHasUploadsContent(zip: AdmZip) {
  return zip.getEntries().some((entry) => entry.entryName === "uploads/" || entry.entryName.startsWith("uploads/"));
}

export async function resolveDatabaseFilePath() {
  if (env.databaseUrl.startsWith("file:")) {
    const rawPath = env.databaseUrl.slice("file:".length);
    const resolvedFromEnv = path.resolve(process.cwd(), rawPath);
    try {
      await fs.access(resolvedFromEnv);
      return resolvedFromEnv;
    } catch {
      // fall back to legacy local paths below
    }
  }

  const candidates = [
    path.resolve(process.cwd(), "prisma", "dev.db"),
    path.resolve(process.cwd(), "data", "dev.db"),
    path.resolve(process.cwd(), "dev.db")
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // keep searching
    }
  }

  throw new AppError(500, "Could not find the local SQLite database file.");
}

export async function buildBackupArchiveBuffer() {
  const chunks: Buffer[] = [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  return new Promise<Buffer>((resolve, reject) => {
    const archive = new archiver.ZipArchive({ zlib: { level: 9 } });
    let settled = false;

    const finish = () => {
      if (!settled) {
        settled = true;
        resolve(Buffer.concat(chunks));
      }
    };

    archive.on("data", (chunk: Buffer | Uint8Array) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    archive.once("warning", (warning: { code?: string }) => {
      if (warning.code !== "ENOENT") {
        reject(warning);
      }
    });
    archive.once("error", reject);
    archive.once("end", finish);
    archive.once("close", finish);

    if (env.databaseUrl.startsWith("file:")) {
      void (async () => {
        const databaseFilePath = await resolveDatabaseFilePath();
        archive.file(databaseFilePath, { name: "database/dev.db" });
        archive.directory(uploadsRoot, "uploads");
        archive.append(
          JSON.stringify(
            {
              createdAt: new Date().toISOString(),
              database: "database/dev.db",
              uploads: "uploads",
              note: "Move both the database file and uploads folder into the target installation."
            },
            null,
            2
          ),
          { name: "backup-manifest.json" }
        );
        await archive.finalize();
      })().catch(reject);
      return;
    }

    void (async () => {
      const snapshot = await readWorkspaceSnapshot(prisma);
      archive.append(
        JSON.stringify(
          {
            createdAt: new Date().toISOString(),
            database: "workspace.json",
            uploads: "uploads",
            note: "This archive stores a JSON workspace snapshot plus uploaded files."
          },
          null,
          2
        ),
        { name: "backup-manifest.json" }
      );
      archive.append(JSON.stringify(snapshot, null, 2), { name: "workspace.json" });
      archive.directory(uploadsRoot, "uploads");
      await archive.finalize();
    })().catch(reject);
  });
}

export async function restoreBackupArchiveBuffer(buffer: Buffer) {
  const zip = new AdmZip(buffer);
  const databaseEntry = zip.getEntry("database/dev.db");
  const workspaceEntry = zip.getEntry("workspace.json");

  if (!databaseEntry && !workspaceEntry) {
    throw new AppError(400, "The backup archive does not contain database/dev.db or workspace.json.");
  }

  if (!zipHasUploadsContent(zip)) {
    throw new AppError(400, "The backup archive does not contain the uploads folder.");
  }

  const restoreRoot = await fs.mkdtemp(path.join(os.tmpdir(), "alaino-restore-"));
  const backupStamp = new Date().toISOString().replace(/[:.]/g, "-");

  try {
    zip.extractAllTo(restoreRoot, true);

    const extractedUploadsPath = path.join(restoreRoot, "uploads");
    const targetDatabaseIsSqlite = env.databaseUrl.startsWith("file:");

    if (workspaceEntry) {
      const rawWorkspaceJson = zip.readAsText(workspaceEntry);
      const parsedSnapshot = JSON.parse(rawWorkspaceJson) as WorkspaceSnapshotLike;
      await writeWorkspaceSnapshotToTarget(prisma, parsedSnapshot);
    } else if (databaseEntry) {
      const extractedDatabasePath = path.join(restoreRoot, "database", "dev.db");

      if (targetDatabaseIsSqlite) {
        const targetDatabasePath = await resolveDatabaseFilePath();
        const databaseBackupPath = `${targetDatabasePath}.before-restore-${backupStamp}`;

        await prisma.$disconnect();
        await fs.copyFile(targetDatabasePath, databaseBackupPath).catch(() => undefined);
        await fs.copyFile(extractedDatabasePath, targetDatabasePath);
        await prisma.$connect();
      } else {
      await importSqliteDatabaseToTarget(extractedDatabasePath);
      }
    }

    await fs.rm(uploadsRoot, { recursive: true, force: true });
    await ensureUploadDirs();
    await fs.cp(extractedUploadsPath, uploadsRoot, { recursive: true, force: true });

    return {
      databasePath: targetDatabaseIsSqlite ? await resolveDatabaseFilePath() : "postgresql:workspace-imported"
    };
  } finally {
    await fs.rm(restoreRoot, { recursive: true, force: true }).catch(() => undefined);
  }
}

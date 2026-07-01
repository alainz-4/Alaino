import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import AdmZip from "adm-zip";
import { prisma } from "./prisma.js";
import { AppError } from "./errors.js";
import { env } from "../env.js";
import { uploadsRoot, ensureUploadDirs } from "./uploads.js";

const require = createRequire(import.meta.url);
const archiver = require("archiver") as typeof import("archiver");

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
  const databaseFilePath = await resolveDatabaseFilePath();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const chunks: Buffer[] = [];

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

    void archive.finalize().catch(reject);
  });
}

export async function restoreBackupArchiveBuffer(buffer: Buffer) {
  const zip = new AdmZip(buffer);
  const databaseEntry = zip.getEntry("database/dev.db");
  const hasUploadsContent = zip.getEntries().some((entry) => entry.entryName === "uploads/" || entry.entryName.startsWith("uploads/"));

  if (!databaseEntry) {
    throw new AppError(400, "The backup archive does not contain database/dev.db.");
  }

  if (!hasUploadsContent) {
    throw new AppError(400, "The backup archive does not contain the uploads folder.");
  }

  const restoreRoot = await fs.mkdtemp(path.join(os.tmpdir(), "alaino-restore-"));
  const backupStamp = new Date().toISOString().replace(/[:.]/g, "-");

  try {
    zip.extractAllTo(restoreRoot, true);

    const extractedDatabasePath = path.join(restoreRoot, "database", "dev.db");
    const extractedUploadsPath = path.join(restoreRoot, "uploads");
    const targetDatabasePath = await resolveDatabaseFilePath();
    const databaseBackupPath = `${targetDatabasePath}.before-restore-${backupStamp}`;

    await prisma.$disconnect();
    await fs.copyFile(targetDatabasePath, databaseBackupPath).catch(() => undefined);
    await fs.copyFile(extractedDatabasePath, targetDatabasePath);

    await fs.rm(uploadsRoot, { recursive: true, force: true });
    await ensureUploadDirs();
    await fs.cp(extractedUploadsPath, uploadsRoot, { recursive: true, force: true });

    await prisma.$connect();

    return {
      databaseBackupPath,
      databasePath: targetDatabasePath
    };
  } finally {
    await fs.rm(restoreRoot, { recursive: true, force: true }).catch(() => undefined);
  }
}

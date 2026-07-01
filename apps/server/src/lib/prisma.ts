import "../env.js";
import { PrismaClient } from "@prisma/client";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { env } from "../env.js";

function isPostgresDatabaseUrl(databaseUrl: string) {
  return /^postgres(?:ql)?:\/\//i.test(databaseUrl);
}

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

async function createPrismaClient() {
  if (isPostgresDatabaseUrl(env.databaseUrl)) {
    const postgresClientPath = path.resolve(process.cwd(), "generated", "postgres", "index.js");
    const postgresModule = await import(pathToFileURL(postgresClientPath).href);
    const PostgresPrismaClient = postgresModule.PrismaClient as typeof PrismaClient;
    return new PostgresPrismaClient({
      log: envLogLevel()
    });
  }

  return new PrismaClient({
    log: envLogLevel()
  });
}

export const prisma = global.__prisma ?? (await createPrismaClient());

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

function envLogLevel(): Array<"query" | "info" | "warn" | "error"> {
  return process.env.PRISMA_LOG === "query"
    ? ["query", "info", "warn", "error"]
    : ["warn", "error"];
}

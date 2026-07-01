import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "./prisma.js";
import { env } from "../env.js";
import { writeWorkspaceSnapshotToTarget, type WorkspaceSnapshotLike } from "./backup.js";

const LEGACY_WORKSPACE_SNAPSHOT_PATH = path.resolve(process.cwd(), "apps", "server", "prisma", "seed", "workspace.json");

export async function importLegacyWorkspaceSnapshotIfNeeded() {
  if (!env.databaseUrl.startsWith("postgres")) {
    return { imported: false, reason: "non-postgres" };
  }

  try {
    await fs.access(LEGACY_WORKSPACE_SNAPSHOT_PATH);
  } catch {
    return { imported: false, reason: "legacy-snapshot-missing" };
  }

  const existingProfile = await prisma.userProfile.findFirst({
    where: {
      OR: [{ fullName: "Alain Joseph ZGHEIB" }, { profilePreset: "LEBANESE_COMPANY" }]
    }
  });

  if (existingProfile) {
    return { imported: false, reason: "snapshot-already-present" };
  }

  const snapshot = JSON.parse(await fs.readFile(LEGACY_WORKSPACE_SNAPSHOT_PATH, "utf8")) as WorkspaceSnapshotLike;
  await writeWorkspaceSnapshotToTarget(prisma, snapshot);
  return { imported: true, reason: "legacy-snapshot-imported" };
}

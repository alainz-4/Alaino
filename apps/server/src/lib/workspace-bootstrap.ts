import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "./prisma.js";
import { env } from "../env.js";
import { writeWorkspaceSnapshotToTarget, type WorkspaceSnapshotLike } from "./backup.js";

const LEGACY_WORKSPACE_SNAPSHOT_PATHS = [
  path.resolve(process.cwd(), "prisma", "seed", "workspace.json"),
  path.resolve(process.cwd(), "apps", "server", "prisma", "seed", "workspace.json")
];

async function resolveLegacyWorkspaceSnapshotPath() {
  for (const candidate of LEGACY_WORKSPACE_SNAPSHOT_PATHS) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // keep searching
    }
  }

  return null;
}

export async function importLegacyWorkspaceSnapshotIfNeeded() {
  if (!env.databaseUrl.startsWith("postgres")) {
    return { imported: false, reason: "non-postgres" };
  }

  const legacyWorkspaceSnapshotPath = await resolveLegacyWorkspaceSnapshotPath();
  if (!legacyWorkspaceSnapshotPath) {
    return { imported: false, reason: "legacy-snapshot-missing" };
  }

  const existingProfile = await prisma.userProfile.findFirst({
    where: {
      fullName: "Alain Joseph ZGHEIB",
      profilePreset: "LEBANESE_COMPANY"
    }
  });

  if (existingProfile) {
    return { imported: false, reason: "snapshot-already-present" };
  }

  const snapshot = JSON.parse(await fs.readFile(legacyWorkspaceSnapshotPath, "utf8")) as WorkspaceSnapshotLike;
  await writeWorkspaceSnapshotToTarget(prisma, snapshot);
  return { imported: true, reason: "legacy-snapshot-imported" };
}

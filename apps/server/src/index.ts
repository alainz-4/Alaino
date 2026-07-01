import fs from "node:fs/promises";
import path from "node:path";
import { createApp } from "./app.js";
import { env } from "./env.js";
import { ensureUploadDirs } from "./lib/uploads.js";
import { importLegacyWorkspaceSnapshotIfNeeded } from "./lib/workspace-bootstrap.js";

const app = createApp();

await ensureUploadDirs();
if (env.databaseUrl.startsWith("file:")) {
  const rawPath = env.databaseUrl.slice("file:".length);
  await fs.mkdir(path.dirname(path.resolve(process.cwd(), rawPath)), { recursive: true });
}

const snapshotResult = await importLegacyWorkspaceSnapshotIfNeeded();
if (snapshotResult.imported) {
  console.log("Imported legacy workspace snapshot into the live database.");
}

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${env.port}`);
});

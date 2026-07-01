import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nodeExecutable = process.execPath;
const logDir = path.join(os.tmpdir(), "freelance-dashboard-logs");
await fs.mkdir(logDir, { recursive: true });

async function start(name, command, args, cwd) {
  const stdout = await fs.open(path.join(logDir, `${name}.out.log`), "a");
  const stderr = await fs.open(path.join(logDir, `${name}.err.log`), "a");
  const child = spawn(command, args, {
    cwd,
    stdio: ["ignore", stdout.fd, stderr.fd],
    env: process.env,
    windowsHide: true,
    detached: true
  });

  child.unref();
  await stdout.close();
  await stderr.close();
  console.log(`[${name}] started (pid ${child.pid})`);

  return child;
}

await start(
  "server",
  nodeExecutable,
  [
    path.join(repoRoot, "node_modules", ".pnpm", "tsx@4.22.4", "node_modules", "tsx", "dist", "cli.mjs"),
    "watch",
    "src/index.ts"
  ],
  path.join(repoRoot, "apps", "server")
);

await start(
  "web",
  nodeExecutable,
  [path.join(repoRoot, "scripts", "web-dev.mjs")],
  path.join(repoRoot, "apps", "web")
);

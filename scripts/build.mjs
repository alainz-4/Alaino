import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nodeExecutable = process.execPath;
const pnpmStoreRoot = path.join(repoRoot, "node_modules", ".pnpm");
const reactRouterStoreDir = fs.readdirSync(pnpmStoreRoot).find((entry) => entry.startsWith("react-router@"));
const remixRouterStoreDir = fs.readdirSync(pnpmStoreRoot).find((entry) => entry.startsWith("@remix-run+router@"));
const schedulerStoreDir = fs.readdirSync(pnpmStoreRoot).find((entry) => entry.startsWith("scheduler@"));

if (!reactRouterStoreDir) {
  throw new Error("Could not locate react-router in the pnpm store.");
}

if (!remixRouterStoreDir) {
  throw new Error("Could not locate @remix-run/router in the pnpm store.");
}

if (!schedulerStoreDir) {
  throw new Error("Could not locate scheduler in the pnpm store.");
}

function run(command, args, cwd = repoRoot) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
    shell: false
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(nodeExecutable, [path.join(repoRoot, "node_modules", "typescript", "lib", "tsc.js"), "-p", "packages/shared/tsconfig.json"]);
run(nodeExecutable, [path.join(repoRoot, "node_modules", "typescript", "lib", "tsc.js"), "-p", "apps/server/tsconfig.json"]);
run(nodeExecutable, [path.join(repoRoot, "node_modules", "typescript", "lib", "tsc.js"), "-p", "apps/web/tsconfig.json"]);

const viteModule = await import(pathToFileURL(path.join(repoRoot, "apps", "web", "node_modules", "vite", "dist", "node", "index.js")).href);
const reactModule = await import(pathToFileURL(path.join(repoRoot, "apps", "web", "node_modules", "@vitejs", "plugin-react", "dist", "index.js")).href);

await viteModule.build({
  root: path.join(repoRoot, "apps", "web"),
  configFile: false,
  cacheDir: path.join(os.tmpdir(), "freelance-dashboard-vite-cache"),
  plugins: [reactModule.default()],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "react-router": path.join(pnpmStoreRoot, reactRouterStoreDir, "node_modules", "react-router", "dist", "index.js"),
      "@remix-run/router": path.join(pnpmStoreRoot, remixRouterStoreDir, "node_modules", "@remix-run", "router", "dist", "router.js"),
      scheduler: path.join(pnpmStoreRoot, schedulerStoreDir, "node_modules", "scheduler", "index.js")
    }
  }
});

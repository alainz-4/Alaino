import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nodeExecutable = process.execPath;

const serverCandidates = [
  path.join(repoRoot, "apps", "server", "dist", "apps", "server", "src", "index.js"),
  path.join(repoRoot, "apps", "server", "dist", "index.js")
];
const serverEntry = serverCandidates.find((candidate) => fs.existsSync(candidate));

if (!serverEntry) {
  throw new Error("Could not find the compiled server entrypoint.");
}

function launchDetached(command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    shell: false,
    env: process.env
  });

  child.unref();
  return child;
}

function waitForUrl(url, timeoutMs = 30000, intervalMs = 300) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const tick = () => {
      const request = http.get(url, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) {
          resolve(true);
          return;
        }

        retry();
      });

      request.on("error", retry);
    };

    const retry = () => {
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }

      setTimeout(tick, intervalMs);
    };

    tick();
  });
}

launchDetached(nodeExecutable, [serverEntry], path.join(repoRoot, "apps", "server"));

await waitForUrl("http://127.0.0.1:3001/health");

launchDetached("cmd.exe", ["/c", "start", "", "http://127.0.0.1:3001"], repoRoot);

process.on("exit", () => {
  // Intentionally left blank: keep the launcher alive so the child servers stay up.
});

setInterval(() => {}, 60_000);

// eslint-disable-next-line no-console
console.log("Freelance dashboard is launching...");

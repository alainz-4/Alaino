import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import os from "node:os";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webRoot = path.join(repoRoot, "apps", "web");
const vitePkgRoot = path.join(
  repoRoot,
  "node_modules",
  ".pnpm",
  "vite@5.4.21_@types+node@22.19.19",
  "node_modules",
  "vite"
);
const reactPkgRoot = path.join(
  repoRoot,
  "node_modules",
  ".pnpm",
  "@vitejs+plugin-react@4.7.0_vite@5.4.21_@types+node@22.19.19_",
  "node_modules",
  "@vitejs",
  "plugin-react"
);

const { createServer } = await import(pathToFileURL(path.join(vitePkgRoot, "dist", "node", "index.js")).href);
const reactModule = await import(pathToFileURL(path.join(reactPkgRoot, "dist", "index.js")).href);
const react = reactModule.default;

const server = await createServer({
  root: webRoot,
  configFile: false,
  cacheDir: path.join(os.tmpdir(), "freelance-dashboard-vite-cache"),
  plugins: [react()],
  optimizeDeps: {
    noDiscovery: true,
    include: []
  },
  resolve: {
    preserveSymlinks: true
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:3001"
    }
  }
});

await server.listen();
server.printUrls();

import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
import { createRequire } from "module";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const require = createRequire(import.meta.url);
const clerkSharedRoot = path.dirname(
  require.resolve("@clerk/shared/package.json"),
);

// @clerk/react@6 imports many @clerk/shared subpaths (e.g. @clerk/shared/loadClerkJsScript)
// that are emitted to dist/runtime/* but not advertised explicitly in the package.json
// "exports" field, so Rollup fails to resolve them during production build. Map them
// programmatically rather than hand-listing each subpath.
function clerkSharedSubpathPlugin(): Plugin {
  const prefix = "@clerk/shared/";
  return {
    name: "clerk-shared-subpath-resolver",
    enforce: "pre",
    resolveId(source) {
      if (!source.startsWith(prefix)) return null;
      const rest = source.slice(prefix.length);
      const candidates = [
        path.join(clerkSharedRoot, "dist/runtime", `${rest}.mjs`),
        path.join(clerkSharedRoot, "dist/runtime", rest, "index.mjs"),
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) return c;
      }
      return null;
    },
  };
}

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    clerkSharedSubpathPlugin(),
    react(),
    tailwindcss({ optimize: false }),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom", "@clerk/react", "@clerk/shared"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});

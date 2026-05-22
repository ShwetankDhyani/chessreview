import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createGameImportMiddleware } from "./server/gameUrlImport.mjs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "game-import-api",
      configureServer(server) {
        server.middlewares.use(createGameImportMiddleware());
      },
    },
  ],
  worker: {
    format: "es",
  },
  optimizeDeps: {
    exclude: ["stockfish"],
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});

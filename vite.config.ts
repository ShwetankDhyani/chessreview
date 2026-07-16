import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createGameImportMiddleware } from "./server/gameUrlImport.mjs";
import { createReviewStatsMiddleware } from "./server/reviewStats.mjs";
import { createShareMiddleware } from "./server/reviewSharesApi.mjs";
import { createSavedReviewsMiddleware } from "./server/reviewSavesApi.mjs";
import { createAboutCommentsMiddleware } from "./server/aboutCommentsApi.mjs";
import { createBlogMiddleware } from "./server/blogApi.mjs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "game-import-api",
      configureServer(server) {
        server.middlewares.use(createGameImportMiddleware());
        server.middlewares.use(createReviewStatsMiddleware());
        server.middlewares.use(createShareMiddleware());
        server.middlewares.use(createSavedReviewsMiddleware());
        server.middlewares.use(createAboutCommentsMiddleware());
        server.middlewares.use(createBlogMiddleware());
      },
    },
  ],
  worker: {
    format: "es",
  },
  optimizeDeps: {
    exclude: ["stockfish"],
  },
  build: {
    rollupOptions: {
      output: {
        // Parallel vendor chunks — same UI, smaller initial parse of app code.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (
            id.includes("react-dom") ||
            id.includes("/react/") ||
            id.includes("react-router") ||
            id.includes("scheduler")
          ) {
            return "react-vendor";
          }
          if (id.includes("chess.js") || id.includes("react-chessboard")) {
            return "chess-vendor";
          }
        },
      },
    },
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createGameImportMiddleware } from "./server/gameUrlImport.mjs";
import { createReviewStatsMiddleware } from "./server/reviewStats.mjs";
import { createShareMiddleware } from "./server/reviewSharesApi.mjs";
import { createSavedReviewsMiddleware } from "./server/reviewSavesApi.mjs";
import { createAboutCommentsMiddleware } from "./server/aboutCommentsApi.mjs";
import { createBlogMiddleware } from "./server/blogApi.mjs";
import { createDemoReviewMiddleware } from "./server/demoReviewApi.mjs";

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
        server.middlewares.use(createDemoReviewMiddleware());
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

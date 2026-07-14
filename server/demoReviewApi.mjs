/**
 * Demo review API — engine file store with local fallback for non-Vercel.
 */

import { engineStatsUrl } from "./reviewStats.mjs";
import { fileGetDemoReview } from "./demoReview.mjs";

function isWritableStore() {
  if (process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return false;
  }
  return true;
}

async function readEngineJson(path) {
  const base = engineStatsUrl();
  if (!base) return null;
  const res = await fetch(`${base}${path}`, {
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message =
      (data && typeof data.error === "string" && data.error) ||
      `Demo review failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export async function getDemoReview() {
  const base = engineStatsUrl();
  if (base) {
    try {
      const engine = await readEngineJson("/demo-review");
      if (engine?.pgn && Array.isArray(engine.moves) && engine.summary) {
        return engine;
      }
    } catch (e) {
      if (!isWritableStore()) throw e;
    }
  }
  return fileGetDemoReview();
}

export function createDemoReviewMiddleware() {
  return async (req, res, next) => {
    const url = req.url?.split("?")[0] ?? "";
    if (url !== "/api/demo-review") return next();

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method !== "GET") {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: "GET only" }));
      return;
    }

    try {
      const row = await getDemoReview();
      if (!row) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Demo review not ready" }));
        return;
      }
      res.statusCode = 200;
      res.end(JSON.stringify(row));
    } catch (e) {
      res.statusCode = 500;
      res.end(
        JSON.stringify({
          error: e instanceof Error ? e.message : "Demo review failed",
        })
      );
    }
  };
}

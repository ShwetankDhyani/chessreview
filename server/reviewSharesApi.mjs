/**
 * Share API — engine file store with optional in-memory fallback for dev.
 */

import { engineStatsUrl } from "./reviewStats.mjs";
import { fileCreateShare, fileGetShare } from "./reviewShares.mjs";

async function fetchEngineJson(path, options = {}) {
  const base = engineStatsUrl();
  if (!base) return null;
  const res = await fetch(`${base}${path}`, {
    ...options,
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getShare(id) {
  const engine = await fetchEngineJson(`/share/${encodeURIComponent(id)}`);
  if (engine && engine.pgn) return engine;
  return fileGetShare(id);
}

export async function createShare(body) {
  const engine = await fetchEngineJson("/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (engine?.id) return engine;
  return fileCreateShare(body);
}

export function createShareMiddleware() {
  return async (req, res, next) => {
    const url = req.url?.split("?")[0] ?? "";
    if (url !== "/api/share") return next();

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === "GET") {
      const q = new URL(req.url, "http://localhost").searchParams.get("id");
      if (!q) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Missing id" }));
        return;
      }
      try {
        const row = await getShare(q);
        if (!row) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: "Not found" }));
          return;
        }
        res.statusCode = 200;
        res.end(JSON.stringify(row));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e instanceof Error ? e.message : "Share failed" }));
      }
      return;
    }

    if (req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", async () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          const result = await createShare(parsed);
          res.statusCode = 200;
          res.end(JSON.stringify({ ok: true, ...result }));
        } catch (e) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : "Share failed" }));
        }
      });
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ error: "GET or POST only" }));
  };
}

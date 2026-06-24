/**
 * Share API — engine file store with optional local file fallback for dev.
 */

import { engineStatsUrl } from "./reviewStats.mjs";
import { fileCreateShare, fileGetShare } from "./reviewShares.mjs";

function isWritableShareStore() {
  if (process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return false;
  }
  return true;
}

function validateSharePayload(body) {
  if (!body?.pgn || !Array.isArray(body.moves) || !body.summary) {
    throw new Error("Invalid share payload");
  }
}

async function readEngineJson(path, options = {}) {
  const base = engineStatsUrl();
  if (!base) return null;
  const res = await fetch(`${base}${path}`, {
    ...options,
    signal: AbortSignal.timeout(12_000),
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
      `Engine share failed (${res.status})`;
    if (res.status === 404) {
      throw new Error("Share is not enabled on the analysis server yet");
    }
    throw new Error(message);
  }
  return data;
}

export async function getShare(id) {
  const base = engineStatsUrl();
  if (base) {
    try {
      const engine = await readEngineJson(`/share/${encodeURIComponent(id)}`);
      if (engine?.pgn) return engine;
    } catch (e) {
      if (!isWritableShareStore()) throw e;
    }
  }
  return fileGetShare(id);
}

export async function createShare(body) {
  validateSharePayload(body);
  const normalized = {
    pgn: String(body.pgn).slice(0, 120_000),
    whiteName: body.whiteName ?? "White",
    blackName: body.blackName ?? "Black",
    summary: body.summary,
    moves: body.moves,
    run: body.run ?? null,
  };

  const base = engineStatsUrl();
  if (base) {
    try {
      const engine = await readEngineJson("/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalized),
      });
      if (engine?.id) return engine;
    } catch (e) {
      if (!isWritableShareStore()) throw e;
    }
  }

  if (!isWritableShareStore()) {
    throw new Error(
      "Share storage is unavailable. Set EVAL_SERVER_URL on Vercel and update the analysis server."
    );
  }

  return fileCreateShare(normalized);
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

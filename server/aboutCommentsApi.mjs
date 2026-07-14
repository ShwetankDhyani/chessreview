/**
 * About comments API — engine file store with local fallback for dev.
 */

import { engineStatsUrl } from "./reviewStats.mjs";
import { fileCreateComment, fileListComments } from "./aboutComments.mjs";

function isWritableStore() {
  if (process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return false;
  }
  return true;
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
      `Comments failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export async function listAboutComments({ page = 1, pageSize = 8 } = {}) {
  const qs = `?page=${encodeURIComponent(String(page))}&pageSize=${encodeURIComponent(String(pageSize))}`;
  const base = engineStatsUrl();
  if (base) {
    try {
      const engine = await readEngineJson(`/about-comments${qs}`);
      if (engine?.items) return engine;
    } catch (e) {
      if (!isWritableStore()) throw e;
    }
  }
  return fileListComments({ page, pageSize });
}

export async function createAboutComment(body) {
  const base = engineStatsUrl();
  if (base) {
    try {
      const engine = await readEngineJson("/about-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (engine?.ok || engine?.id) return engine;
    } catch (e) {
      if (!isWritableStore()) throw e;
    }
  }

  if (!isWritableStore()) {
    throw new Error(
      "Comments are unavailable right now. Set EVAL_SERVER_URL on Vercel and update the analysis server."
    );
  }

  return fileCreateComment(body);
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

export function createAboutCommentsMiddleware() {
  return async (req, res, next) => {
    const path = req.url?.split("?")[0] ?? "";
    if (path !== "/api/about-comments") return next();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    try {
      if (req.method === "GET") {
        const url = new URL(req.url, "http://localhost");
        const page = parseInt(url.searchParams.get("page") ?? "1", 10);
        const pageSize = parseInt(url.searchParams.get("pageSize") ?? "8", 10);
        const data = await listAboutComments({ page, pageSize });
        return sendJson(res, 200, data);
      }

      if (req.method === "POST") {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const raw = Buffer.concat(chunks).toString("utf8");
        const body = raw ? JSON.parse(raw) : {};
        const result = await createAboutComment(body);
        return sendJson(res, 200, { ok: true, ...result });
      }

      return sendJson(res, 405, { error: "GET or POST only" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed";
      return sendJson(res, 400, { error: message });
    }
  };
}

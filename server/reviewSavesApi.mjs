import { engineStatsUrl } from "./reviewStats.mjs";
import {
  fileDeleteSavedReview,
  fileGetSavedReview,
  fileListSavedReviews,
  fileSaveReview,
} from "./reviewSaves.mjs";

function isWritableStore() {
  if (process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return false;
  }
  return true;
}

async function readEngineJson(path, init = {}) {
  const base = engineStatsUrl();
  if (!base) return null;
  const res = await fetch(`${base}${path}`, {
    ...init,
    signal: AbortSignal.timeout(12_000),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    throw new Error(data?.error ?? `Saved review API failed (${res.status})`);
  }
  return data;
}

function savedReviewsUnavailableMessage() {
  return "Saved review storage is unavailable. Configure EVAL_SERVER_URL with saved-reviews support.";
}

export async function listSavedReviews(platform, username) {
  const base = engineStatsUrl();
  if (base) {
    const engine = await readEngineJson(
      `/saved-reviews?platform=${encodeURIComponent(platform)}&username=${encodeURIComponent(
        username
      )}`
    );
    if (engine) return engine;
  }
  if (!isWritableStore()) {
    throw new Error(savedReviewsUnavailableMessage());
  }
  return { ok: true, items: fileListSavedReviews(platform, username) };
}

export async function getSavedReview(id, platform, username) {
  const base = engineStatsUrl();
  if (base) {
    const engine = await readEngineJson(
      `/saved-reviews?id=${encodeURIComponent(id)}&platform=${encodeURIComponent(
        platform
      )}&username=${encodeURIComponent(username)}`
    );
    if (engine) return engine;
  }
  if (!isWritableStore()) {
    throw new Error(savedReviewsUnavailableMessage());
  }
  const row = fileGetSavedReview(id, platform, username);
  if (!row) throw new Error("Not found");
  return { ok: true, review: row };
}

export async function saveSavedReview(payload) {
  const base = engineStatsUrl();
  if (base) {
    const engine = await readEngineJson("/saved-reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (engine) return engine;
  }
  if (!isWritableStore()) {
    throw new Error(savedReviewsUnavailableMessage());
  }
  const result = fileSaveReview(payload);
  return { ok: true, ...result };
}

export async function removeSavedReview(id, platform, username) {
  const base = engineStatsUrl();
  if (base) {
    const engine = await readEngineJson(
      `/saved-reviews?id=${encodeURIComponent(id)}&platform=${encodeURIComponent(
        platform
      )}&username=${encodeURIComponent(username)}`,
      { method: "DELETE" }
    );
    if (engine) return engine;
  }
  if (!isWritableStore()) {
    throw new Error(savedReviewsUnavailableMessage());
  }
  const result = fileDeleteSavedReview(id, platform, username);
  if (!result.ok) throw new Error("Access denied");
  return { ok: true };
}

export function createSavedReviewsMiddleware() {
  return async (req, res, next) => {
    const urlPath = req.url?.split("?")[0] ?? "";
    if (urlPath !== "/api/saved-reviews") return next();

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    const qp = new URL(req.url, "http://localhost").searchParams;
    const platform = (qp.get("platform") ?? "").trim();
    const username = (qp.get("username") ?? "").trim();
    const id = (qp.get("id") ?? "").trim();

    if (req.method === "GET") {
      if (!platform || !username) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Missing platform/username" }));
        return;
      }
      try {
        const result = id
          ? await getSavedReview(id, platform, username)
          : await listSavedReviews(platform, username);
        res.statusCode = 200;
        res.end(JSON.stringify(result));
      } catch (e) {
        res.statusCode = e instanceof Error && e.message === "Not found" ? 404 : 500;
        res.end(JSON.stringify({ error: e instanceof Error ? e.message : "Saved reviews failed" }));
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
          const result = await saveSavedReview(parsed);
          res.statusCode = 200;
          res.end(JSON.stringify(result));
        } catch (e) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : "Could not save review" }));
        }
      });
      return;
    }

    if (req.method === "DELETE") {
      if (!platform || !username || !id) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Missing id/platform/username" }));
        return;
      }
      try {
        const result = await removeSavedReview(id, platform, username);
        res.statusCode = 200;
        res.end(JSON.stringify(result));
      } catch (e) {
        res.statusCode = e instanceof Error && e.message === "Access denied" ? 403 : 400;
        res.end(JSON.stringify({ error: e instanceof Error ? e.message : "Could not delete review" }));
      }
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ error: "GET, POST, DELETE only" }));
  };
}

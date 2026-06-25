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
        const base = engineStatsUrl();
        if (base) {
          try {
            const path = id
              ? `/saved-reviews?id=${encodeURIComponent(id)}&platform=${encodeURIComponent(
                  platform
                )}&username=${encodeURIComponent(username)}`
              : `/saved-reviews?platform=${encodeURIComponent(
                  platform
                )}&username=${encodeURIComponent(username)}`;
            const engine = await readEngineJson(path);
            if (engine) {
              res.statusCode = 200;
              res.end(JSON.stringify(engine));
              return;
            }
          } catch (e) {
            if (!isWritableStore()) throw e;
          }
        }
        if (id) {
          const row = fileGetSavedReview(id, platform, username);
          if (!row) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: "Not found" }));
            return;
          }
          res.statusCode = 200;
          res.end(JSON.stringify({ ok: true, review: row }));
          return;
        }
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            ok: true,
            items: fileListSavedReviews(platform, username),
          })
        );
      } catch (e) {
        res.statusCode = 500;
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
          const base = engineStatsUrl();
          if (base) {
            try {
              const engine = await readEngineJson("/saved-reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(parsed),
              });
              if (engine) {
                res.statusCode = 200;
                res.end(JSON.stringify(engine));
                return;
              }
            } catch (e) {
              if (!isWritableStore()) throw e;
            }
          }
          if (!isWritableStore()) {
            throw new Error(
              "Saved review storage is unavailable. Configure EVAL_SERVER_URL with saved-reviews support."
            );
          }
          const result = fileSaveReview(parsed);
          res.statusCode = 200;
          res.end(JSON.stringify({ ok: true, ...result }));
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
        const base = engineStatsUrl();
        if (base) {
          try {
            const engine = await readEngineJson(
              `/saved-reviews?id=${encodeURIComponent(id)}&platform=${encodeURIComponent(
                platform
              )}&username=${encodeURIComponent(username)}`,
              { method: "DELETE" }
            );
            if (engine) {
              res.statusCode = 200;
              res.end(JSON.stringify(engine));
              return;
            }
          } catch (e) {
            if (!isWritableStore()) throw e;
          }
        }
        if (!isWritableStore()) {
          throw new Error(
            "Saved review storage is unavailable. Configure EVAL_SERVER_URL with saved-reviews support."
          );
        }
        const result = fileDeleteSavedReview(id, platform, username);
        if (!result.ok) {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: "Access denied" }));
          return;
        }
        res.statusCode = 200;
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: e instanceof Error ? e.message : "Could not delete review" }));
      }
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ error: "GET, POST, DELETE only" }));
  };
}

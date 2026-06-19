/**
 * Review analytics — engine file store (default) or optional Supabase.
 */

export function engineStatsUrl() {
  const raw =
    process.env.EVAL_SERVER_URL?.trim() ||
    process.env.VITE_EVAL_SERVER_URL?.trim() ||
    "";
  return raw.replace(/\/$/, "");
}

export function isEngineStatsConfigured() {
  return !!engineStatsUrl();
}

async function fetchEngineJson(path, options = {}) {
  const base = engineStatsUrl();
  if (!base) return null;
  const res = await fetch(`${base}${path}`, {
    ...options,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  return res.json();
}

export function isSupabaseConfigured() {
  return !!(
    process.env.SUPABASE_URL?.trim() &&
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

function supabaseHeaders(prefer = "return=minimal") {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: prefer,
  };
}

function supabaseBase() {
  return process.env.SUPABASE_URL.trim().replace(/\/$/, "");
}

export async function callRpc(name, params = {}) {
  const res = await fetch(`${supabaseBase()}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: supabaseHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase RPC ${name} failed: ${text}`);
  }
  return res.json();
}

const MAX_NAME = 120;

function clip(value, max = MAX_NAME) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.slice(0, max);
}

function intOrNull(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function floatOrNull(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function geoFromHeaders(headers = {}) {
  const h = (k) => headers[k] ?? headers[k.toLowerCase()] ?? null;
  return {
    country_code:
      clip(h("x-vercel-ip-country"), 8) ?? clip(h("cf-ipcountry"), 8),
    region:
      clip(h("x-vercel-ip-country-region"), 80) ?? clip(h("cf-region"), 80),
    city: clip(h("x-vercel-ip-city"), 80) ?? clip(h("cf-ipcity"), 80),
    latitude: floatOrNull(h("x-vercel-ip-latitude")),
    longitude: floatOrNull(h("x-vercel-ip-longitude")),
  };
}

export function normalizeReviewPayload(body = {}, geo = {}) {
  const depth = intOrNull(body.depth);
  const durationMs = intOrNull(body.durationMs ?? body.duration_ms);
  if (!depth || depth < 1 || depth > 30) {
    throw new Error("Invalid depth");
  }
  if (durationMs == null || durationMs < 0 || durationMs > 3_600_000) {
    throw new Error("Invalid duration");
  }

  return {
    run_id: clip(body.runId ?? body.run_id, 64),
    username: clip(body.username, 64),
    reviewer_platform: clip(body.reviewerPlatform ?? body.reviewer_platform, 16),
    white_player: clip(body.whitePlayer ?? body.white_player, MAX_NAME) ?? "Unknown",
    black_player: clip(body.blackPlayer ?? body.black_player, MAX_NAME) ?? "Unknown",
    white_rating: intOrNull(body.whiteRating ?? body.white_rating),
    black_rating: intOrNull(body.blackRating ?? body.black_rating),
    result: clip(body.result, 12),
    plies: intOrNull(body.plies),
    depth,
    duration_ms: durationMs,
    timezone: clip(body.timezone, 64),
    locale: clip(body.locale, 16),
    source: clip(body.source, 24),
    country_code: geo.country_code ?? clip(body.countryCode ?? body.country_code, 8),
    region: geo.region ?? clip(body.region, 80),
    city: geo.city ?? clip(body.city, 80),
    latitude: geo.latitude ?? floatOrNull(body.latitude),
    longitude: geo.longitude ?? floatOrNull(body.longitude),
  };
}

export async function insertReviewEvent(row) {
  const res = await fetch(`${supabaseBase()}/rest/v1/review_events`, {
    method: "POST",
    headers: supabaseHeaders("resolution=ignore-duplicates,return=minimal"),
    body: JSON.stringify(row),
  });
  if (res.status === 409) return { duplicate: true };
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return { duplicate: false };
}

export function reviewsBaseline() {
  const raw = process.env.STATS_REVIEWS_BASELINE ?? "";
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function isStatsAvailable() {
  return isEngineStatsConfigured() || isSupabaseConfigured() || reviewsBaseline() > 0;
}

async function dbPublicStats() {
  if (!isSupabaseConfigured()) {
    return { reviewsServed: 0, countryCount: 0, countries: [] };
  }
  return callRpc("get_public_review_stats");
}

async function dbAdminStats() {
  if (!isSupabaseConfigured()) {
    return {
      reviewsServed: 0,
      countryCount: 0,
      countries: [],
      byDepth: [],
      ratingSummary: { avgWhite: null, avgBlack: null, ratedGames: 0 },
      recent: [],
    };
  }
  return callRpc("get_admin_review_stats");
}

function withBaseline(stats) {
  const baseline = reviewsBaseline();
  const live = stats.reviewsServed ?? 0;
  return {
    ...stats,
    baseline,
    liveReviews: live,
    reviewsServed: live + baseline,
    tracking: isSupabaseConfigured()
      ? baseline > 0
        ? "live+baseline"
        : "live"
      : baseline > 0
        ? "baseline_only"
        : "none",
    configured: isStatsAvailable(),
  };
}

export async function getPublicStats() {
  const engine = await fetchEngineJson("/stats");
  if (engine?.count != null) {
    return { count: engine.count };
  }

  if (isSupabaseConfigured()) {
    const stats = withBaseline(await dbPublicStats());
    return { count: stats.reviewsServed ?? 0 };
  }

  return { count: reviewsBaseline() };
}

export async function getTimingStats() {
  const engine = await fetchEngineJson("/stats/timing");
  if (engine && typeof engine.sampleCount === "number") {
    return engine;
  }

  return {
    windowSize: 120,
    sampleCount: 0,
    updatedAt: new Date().toISOString(),
    global: null,
    byDepth: [],
    byDepthPly: [],
  };
}

export async function getAdminStats() {
  const engine = await fetchEngineJson("/stats/admin", {
    headers: {
      "X-Admin-Key":
        process.env.ADMIN_SECRET ?? process.env.STATS_READ_KEY ?? "",
    },
  });
  if (engine) return engine;

  if (isSupabaseConfigured()) {
    return withBaseline(await dbAdminStats());
  }

  return {
    configured: reviewsBaseline() > 0,
    count: reviewsBaseline(),
    reviewsServed: reviewsBaseline(),
    countries: [],
    countryCount: 0,
    byDepth: [],
    ratingSummary: { avgWhite: null, avgBlack: null, ratedGames: 0 },
    recent: [],
  };
}

export async function recordReviewEvent(row) {
  const engine = await fetchEngineJson("/stats/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      runId: row.run_id,
      username: row.username,
      reviewerPlatform: row.reviewer_platform,
      whitePlayer: row.white_player,
      blackPlayer: row.black_player,
      whiteRating: row.white_rating,
      blackRating: row.black_rating,
      result: row.result,
      plies: row.plies,
      depth: row.depth,
      durationMs: row.duration_ms,
      timezone: row.timezone,
      locale: row.locale,
      source: row.source,
      countryCode: row.country_code,
      region: row.region,
      city: row.city,
    }),
  });
  if (engine?.ok) return engine;

  if (isSupabaseConfigured()) {
    return insertReviewEvent(row);
  }

  return { ok: false, reason: "not_configured" };
}

function parseJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.trim()) {
    return JSON.parse(req.body);
  }
  return {};
}

export function createReviewStatsMiddleware() {
  return (req, res, next) => {
    const url = req.url?.split("?")[0] ?? "";

    if (url === "/api/stats/public" && req.method === "GET") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      void (async () => {
        try {
          const stats = await getPublicStats();
          res.statusCode = 200;
          res.end(JSON.stringify(stats));
        } catch (e) {
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              error: e instanceof Error ? e.message : "Stats failed",
            })
          );
        }
      })();
      return;
    }

    if (url === "/api/stats/admin" && req.method === "GET") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      void (async () => {
        const key =
          req.headers["x-admin-key"] ??
          String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
        const expected = process.env.ADMIN_SECRET ?? process.env.STATS_READ_KEY;
        if (!expected || key !== expected) {
          res.statusCode = 401;
          res.end(JSON.stringify({ error: "Unauthorized" }));
          return;
        }
        try {
          const stats = await getAdminStats();
          res.statusCode = 200;
          res.end(JSON.stringify(stats));
        } catch (e) {
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              error: e instanceof Error ? e.message : "Stats failed",
            })
          );
        }
      })();
      return;
    }

    if (url === "/api/stats/timing" && req.method === "GET") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=30");
      void (async () => {
        try {
          const stats = await getTimingStats();
          res.statusCode = 200;
          res.end(JSON.stringify(stats));
        } catch (e) {
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              error: e instanceof Error ? e.message : "Timing stats failed",
              sampleCount: 0,
            })
          );
        }
      })();
      return;
    }

    if (url === "/api/review-events") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.method !== "POST") {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: "POST only" }));
        return;
      }

      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", async () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          const row = normalizeReviewPayload(parsed, geoFromHeaders(req.headers));
          if (!row.run_id) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "Missing runId" }));
            return;
          }
          const result = await recordReviewEvent(row);
          if (result?.ok === false && result.reason === "not_configured") {
            res.statusCode = 503;
            res.end(JSON.stringify(result));
            return;
          }
          res.statusCode = 200;
          res.end(JSON.stringify({ ok: true, ...result }));
        } catch (e) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({
              error: e instanceof Error ? e.message : "Invalid payload",
            })
          );
        }
      });
      return;
    }

    next();
  };
}

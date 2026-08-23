/**
 * File-based review stats (for the Oracle / laptop engine server).
 * Persists to data/review-stats.json next to the repo — no external DB.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "fs";
import { join } from "path";

import {
  computeTimingModel,
} from "./reviewTimingStats.mjs";
import { fileAdminSavedSummary } from "./reviewSaves.mjs";

const DATA_DIR = process.env.REVIEW_STATS_DIR ?? join(process.cwd(), "data");
const STATS_FILE = join(DATA_DIR, "review-stats.json");

function parseBaseline() {
  const n = parseInt(process.env.STATS_REVIEWS_BASELINE ?? "0", 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function defaultState() {
  return {
    baseline: parseBaseline(),
    liveCount: 0,
    events: [],
    testingMode: false,
  };
}

function normalizeHomeGamesNewsSlug(raw) {
  if (raw === "__auto__") return undefined;
  if (raw === null) return null;
  if (typeof raw !== "string") return undefined;
  const slug = raw.trim();
  return slug || null;
}

function serializeSiteSettings(state) {
  const out = { testingMode: !!state.testingMode };
  if (state.homeGamesNewsSlug !== undefined) {
    out.homeGamesNewsSlug = state.homeGamesNewsSlug;
  }
  return out;
}

function loadState() {
  try {
    if (!existsSync(STATS_FILE)) return defaultState();
    const parsed = JSON.parse(readFileSync(STATS_FILE, "utf8"));
    return {
      ...defaultState(),
      ...parsed,
      baseline: parsed.baseline ?? parseBaseline(),
      events: Array.isArray(parsed.events) ? parsed.events : [],
      liveCount: Number(parsed.liveCount) || 0,
      testingMode: !!parsed.testingMode,
      ...( "homeGamesNewsSlug" in parsed
        ? {
            homeGamesNewsSlug: normalizeHomeGamesNewsSlug(
              parsed.homeGamesNewsSlug
            ),
          }
        : {}),
    };
  } catch {
    return defaultState();
  }
}

function saveState(state) {
  mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${STATS_FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
  renameSync(tmp, STATS_FILE);
}

export function filePublicStats() {
  const s = loadState();
  const countries = countryBreakdown(s.events);
  return {
    count: s.baseline + s.liveCount,
    countryCount: countries.length,
    ...serializeSiteSettings(s),
  };
}

function countryBreakdown(events) {
  const map = new Map();
  for (const e of events) {
    const code = e.country_code;
    if (!code) continue;
    map.set(code, (map.get(code) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([countryCode, count]) => ({ countryCode, count }))
    .sort((a, b) => b.count - a.count);
}

function depthBreakdown(events) {
  const map = new Map();
  for (const e of events) {
    const d = e.depth;
    if (!d) continue;
    const row = map.get(d) ?? { depth: d, count: 0, totalMs: 0 };
    row.count += 1;
    row.totalMs += e.duration_ms ?? 0;
    map.set(d, row);
  }
  return [...map.values()]
    .map((r) => ({
      depth: r.depth,
      count: r.count,
      avgDurationMs: r.count ? Math.round(r.totalMs / r.count) : 0,
    }))
    .sort((a, b) => a.depth - b.depth);
}

function ratingSummary(events) {
  const whites = [];
  const blacks = [];
  for (const e of events) {
    if (e.white_rating != null) whites.push(e.white_rating);
    if (e.black_rating != null) blacks.push(e.black_rating);
  }
  const avg = (arr) =>
    arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  return {
    avgWhite: avg(whites),
    avgBlack: avg(blacks),
    ratedGames: events.filter((e) => e.white_rating != null || e.black_rating != null)
      .length,
  };
}

export function fileAdminStats() {
  const s = loadState();
  const events = s.events;
  const countries = countryBreakdown(events);
  return {
    configured: true,
    count: s.baseline + s.liveCount,
    reviewsServed: s.baseline + s.liveCount,
    baseline: s.baseline,
    liveReviews: s.liveCount,
    countryCount: countries.length,
    countries,
    byDepth: depthBreakdown(events),
    ratingSummary: ratingSummary(events),
    // Full history from the beginning — no 80-row cap.
    recent: events,
    recentTotal: events.length,
    savedGames: fileAdminSavedSummary(),
    tracking: "engine-file",
    testingMode: !!s.testingMode,
  };
}

export function fileSetTestingMode(testingMode) {
  return fileSetSiteSettings({ testingMode: !!testingMode });
}

export function fileSetSiteSettings(patch = {}) {
  const s = loadState();
  if (typeof patch.testingMode === "boolean") {
    s.testingMode = patch.testingMode;
  }
  if ("homeGamesNewsSlug" in patch) {
    const normalized = normalizeHomeGamesNewsSlug(patch.homeGamesNewsSlug);
    if (normalized === undefined) {
      delete s.homeGamesNewsSlug;
    } else {
      s.homeGamesNewsSlug = normalized;
    }
  }
  saveState(s);
  return serializeSiteSettings(s);
}

export function fileGetSiteSettings() {
  return serializeSiteSettings(loadState());
}

const GEO_FIELDS = ["country_code", "region", "city", "latitude", "longitude"];

function mergeGeoFields(existing, incoming) {
  let updated = false;
  for (const field of GEO_FIELDS) {
    if (incoming[field] == null || incoming[field] === "") continue;
    if (existing[field] !== incoming[field]) {
      existing[field] = incoming[field];
      updated = true;
    }
  }
  return updated;
}

export function fileLogReview(row) {
  const s = loadState();
  if (row.run_id) {
    const existing = s.events.find((e) => e.run_id === row.run_id);
    if (existing) {
      const merged = mergeGeoFields(existing, row);
      if (merged) saveState(s);
      return {
        duplicate: true,
        merged,
        count: s.baseline + s.liveCount,
      };
    }
  }
  const event = {
    ...row,
    reviewed_at: new Date().toISOString(),
  };
  s.liveCount += 1;
  s.events.unshift(event);
  saveState(s);
  return { duplicate: false, count: s.baseline + s.liveCount };
}

export function fileTimingStats() {
  const s = loadState();
  return computeTimingModel(s.events);
}

export function handleEngineStatsRequest(req, res, url, { adminSecret, readJsonBody, geoFromHeaders, normalizeReviewPayload }) {
  if (url.pathname === "/stats" && req.method === "GET") {
    res.writeHead(200);
    res.end(JSON.stringify(filePublicStats()));
    return true;
  }

  if (url.pathname === "/stats/timing" && req.method === "GET") {
    res.writeHead(200, { "Cache-Control": "public, max-age=30" });
    res.end(JSON.stringify(fileTimingStats()));
    return true;
  }

  if (url.pathname === "/stats/review" && req.method === "POST") {
    void (async () => {
      try {
        const body = await readJsonBody(req);
        const row = normalizeReviewPayload(body, geoFromHeaders(req.headers));
        if (!row.run_id) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "Missing runId" }));
          return;
        }
        const result = fileLogReview(row);
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, ...result }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    })();
    return true;
  }

  if (url.pathname === "/stats/admin" && req.method === "POST") {
    const key = (
      req.headers["x-admin-key"] ??
      String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "")
    ).trim();
    if (!adminSecret || key !== adminSecret) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return true;
    }
    void (async () => {
      try {
        const body = await readJsonBody(req);
        if (
          body?.action === "site-settings" ||
          typeof body?.testingMode === "boolean" ||
          "homeGamesNewsSlug" in (body ?? {})
        ) {
          const patch = {};
          if (typeof body.testingMode === "boolean") {
            patch.testingMode = body.testingMode;
          }
          if ("homeGamesNewsSlug" in body) {
            patch.homeGamesNewsSlug = body.homeGamesNewsSlug;
          }
          const result = fileSetSiteSettings(patch);
          res.writeHead(200);
          res.end(JSON.stringify(result));
          return;
        }
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Unknown admin action" }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    })();
    return true;
  }

  if (url.pathname === "/stats/admin" && req.method === "GET") {
    const key = (
      req.headers["x-admin-key"] ??
      String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "")
    ).trim();
    if (!adminSecret || key !== adminSecret) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return true;
    }
    res.writeHead(200);
    res.end(JSON.stringify(fileAdminStats()));
    return true;
  }

  return false;
}

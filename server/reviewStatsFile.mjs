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

const DATA_DIR = process.env.REVIEW_STATS_DIR ?? join(process.cwd(), "data");
const STATS_FILE = join(DATA_DIR, "review-stats.json");
const MAX_EVENTS = 500;

function parseBaseline() {
  const n = parseInt(process.env.STATS_REVIEWS_BASELINE ?? "0", 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function defaultState() {
  return {
    baseline: parseBaseline(),
    liveCount: 0,
    events: [],
  };
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
  return { count: s.baseline + s.liveCount };
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
    recent: events.slice(0, 80),
    tracking: "engine-file",
  };
}

const GEO_FIELDS = ["country_code", "region", "city", "latitude", "longitude"];

function mergeGeoFields(existing, incoming) {
  let updated = false;
  for (const field of GEO_FIELDS) {
    if (incoming[field] != null && incoming[field] !== "" && !existing[field]) {
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
  if (s.events.length > MAX_EVENTS) s.events.length = MAX_EVENTS;
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

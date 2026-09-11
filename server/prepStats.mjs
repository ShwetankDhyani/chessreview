/**
 * H2H (prep) lookup analytics — Supabase, engine file store, or local file.
 */

import {
  callRpc,
  engineStatsUrl,
  geoFromHeaders,
  isSupabaseConfigured,
} from "./reviewStats.mjs";

// note: reviewStats imports this module dynamically to avoid a cycle.

const MAX_NAME = 64;

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

function boolOrNull(value) {
  if (value == null) return null;
  return !!value;
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

export { geoFromHeaders };

export function emptyPrepAdminStats() {
  return {
    lookupsServed: 0,
    countryCount: 0,
    countries: [],
    byPlatform: [],
    modeSummary: { solo: 0, compare: 0, compareSkipped: 0 },
    cacheSummary: { hits: 0, misses: 0, hitRatePct: null },
    avgDurationMs: null,
    recent: [],
    recentTotal: 0,
  };
}

/**
 * Build a DB row from a successful analyze result + request meta.
 */
export function buildPrepLookupRow({
  body = {},
  result = {},
  durationMs = null,
  geo = {},
  source = "h2h",
} = {}) {
  const opponent = result.opponent ?? {};
  const self = result.self ?? null;
  const compareSkipped = !!result.compareSkipped;
  const compare = !!self && !compareSkipped;

  return {
    username:
      clip(opponent.username ?? body.username ?? body.targetUsername, MAX_NAME) ??
      "Unknown",
    platform:
      clip(
        opponent.platform ?? body.platform ?? body.targetPlatform,
        16
      ) ?? "unknown",
    self_username: clip(
      self?.username ?? body.selfUsername ?? body.meUsername,
      MAX_NAME
    ),
    self_platform: clip(
      self?.platform ?? body.selfPlatform ?? body.mePlatform,
      16
    ),
    compare,
    compare_skipped: compareSkipped,
    compare_skip_reason: clip(result.compareSkipped?.reason, 40),
    cache_hit: boolOrNull(opponent.cache?.hit),
    self_cache_hit: self ? boolOrNull(self.cache?.hit) : null,
    sample_size: intOrNull(opponent.sampleSize),
    self_sample_size: self ? intOrNull(self.sampleSize) : null,
    duration_ms: intOrNull(durationMs),
    timezone: clip(body.timezone, 64),
    locale: clip(body.locale, 16),
    source: clip(body.source ?? source, 24),
    country_code:
      clip(body.countryCode ?? body.country_code, 8) ?? geo.country_code,
    region: clip(body.region, 80) ?? geo.region,
    city: clip(body.city, 80) ?? geo.city,
    latitude: geo.latitude ?? null,
    longitude: geo.longitude ?? null,
  };
}

export async function insertPrepLookupEvent(row) {
  const res = await fetch(`${supabaseBase()}/rest/v1/prep_lookup_events`, {
    method: "POST",
    headers: supabaseHeaders("return=minimal"),
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return { ok: true };
}

async function dbPrepAdminStats() {
  if (!isSupabaseConfigured()) return emptyPrepAdminStats();
  try {
    return await callRpc("get_admin_prep_stats");
  } catch {
    return emptyPrepAdminStats();
  }
}

/**
 * Prefer Supabase when configured; otherwise use engine/file fallback if provided.
 */
export async function getPrepAdminStats(fallback = null) {
  if (isSupabaseConfigured()) {
    return dbPrepAdminStats();
  }
  if (fallback && typeof fallback === "object") {
    return { ...emptyPrepAdminStats(), ...fallback };
  }
  try {
    const { filePrepAdminStats } = await import("./reviewStatsFile.mjs");
    return filePrepAdminStats();
  } catch {
    return emptyPrepAdminStats();
  }
}

async function postEnginePrep(row) {
  const base = engineStatsUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/stats/prep`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Persist one successful H2H lookup. Never throws to callers — best-effort.
 */
export async function recordPrepLookupEvent(row) {
  try {
    if (isSupabaseConfigured()) {
      await insertPrepLookupEvent(row);
      // Mirror to engine file store when available (same pattern as reviews).
      void postEnginePrep(row);
      return { ok: true, via: "supabase" };
    }

    const engine = await postEnginePrep(row);
    if (engine?.ok) return { ok: true, via: "engine" };

    const { fileLogPrep } = await import("./reviewStatsFile.mjs");
    return { ok: true, via: "file", ...fileLogPrep(row) };
  } catch (e) {
    console.warn(
      "[prepStats] record failed:",
      e instanceof Error ? e.message : e
    );
    return { ok: false, reason: e instanceof Error ? e.message : "failed" };
  }
}

/**
 * Fire-and-forget helper for analyze handlers.
 */
export function recordPrepLookupFromAnalyze({
  body,
  result,
  durationMs,
  headers,
  source,
}) {
  const row = buildPrepLookupRow({
    body,
    result,
    durationMs,
    geo: geoFromHeaders(headers ?? {}),
    source,
  });
  void recordPrepLookupEvent(row);
}

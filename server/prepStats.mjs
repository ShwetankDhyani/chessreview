/**
 * H2H (prep) lookup analytics — Supabase, engine file store, or local file.
 *
 * Recording must be awaited on Vercel: fire-and-forget work is frozen after
 * the response is sent, which is why admin showed no H2H history.
 */

import {
  callRpc,
  engineStatsUrl,
  geoFromHeaders,
  isSupabaseConfigured,
} from "./reviewStats.mjs";

// note: reviewStats imports this module dynamically to avoid a cycle.

const MAX_NAME = 64;
const LOOKUP_CACHE_PREFIX = "lookup_event:";
/** Keep fallback event rows for a long time (not the 24h form cache TTL). */
const LOOKUP_EVENT_TTL_MS = 10 * 365 * 24 * 60 * 60 * 1000;

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

function hasPrepData(stats) {
  if (!stats || typeof stats !== "object") return false;
  return (stats.lookupsServed ?? 0) > 0 || (stats.recentTotal ?? 0) > 0;
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

/** Normalize a client/engine POST body into a storage row. */
export function normalizePrepLookupPayload(body = {}, geo = {}) {
  return {
    username: clip(body.username, MAX_NAME) ?? "Unknown",
    platform: clip(body.platform, 16) ?? "unknown",
    self_username: clip(body.selfUsername ?? body.self_username, MAX_NAME),
    self_platform: clip(body.selfPlatform ?? body.self_platform, 16),
    compare: !!body.compare,
    compare_skipped: !!body.compareSkipped || !!body.compare_skipped,
    compare_skip_reason: clip(
      body.compareSkipReason ?? body.compare_skip_reason,
      40
    ),
    cache_hit: boolOrNull(body.cacheHit ?? body.cache_hit),
    self_cache_hit: boolOrNull(body.selfCacheHit ?? body.self_cache_hit),
    sample_size: intOrNull(body.sampleSize ?? body.sample_size),
    self_sample_size: intOrNull(body.selfSampleSize ?? body.self_sample_size),
    duration_ms: intOrNull(body.durationMs ?? body.duration_ms),
    timezone: clip(body.timezone, 64),
    locale: clip(body.locale, 16),
    source: clip(body.source ?? "h2h", 24),
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

/**
 * Fallback when prep_lookup_events isn't migrated yet: store in prep_form_cache
 * with a dedicated cache_key prefix (platform still must be lichess|chesscom).
 */
async function insertPrepLookupEventViaCache(row) {
  const platform =
    row.platform === "lichess" || row.platform === "chesscom"
      ? row.platform
      : "lichess";
  const cacheKey = `${LOOKUP_CACHE_PREFIX}${Date.now()}:${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  const event = {
    ...row,
    looked_up_at: new Date().toISOString(),
    __type: "prep_lookup_event",
  };
  const body = {
    cache_key: cacheKey,
    platform,
    username: String(row.username || "unknown")
      .trim()
      .toLowerCase()
      .slice(0, 64),
    payload: event,
    expires_at: new Date(Date.now() + LOOKUP_EVENT_TTL_MS).toISOString(),
    updated_at: new Date().toISOString(),
  };
  const res = await fetch(
    `${supabaseBase()}/rest/v1/prep_form_cache?on_conflict=cache_key`,
    {
      method: "POST",
      headers: supabaseHeaders("resolution=merge-duplicates,return=minimal"),
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return { ok: true, via: "prep_form_cache" };
}

function aggregatePrepEvents(events) {
  const countriesMap = new Map();
  const platformMap = new Map();
  let solo = 0;
  let compare = 0;
  let compareSkipped = 0;
  let hits = 0;
  let misses = 0;
  let durationSum = 0;
  let durationCount = 0;

  for (const e of events) {
    const code = e.country_code;
    if (code) countriesMap.set(code, (countriesMap.get(code) ?? 0) + 1);
    const platform = e.platform || "unknown";
    platformMap.set(platform, (platformMap.get(platform) ?? 0) + 1);
    if (e.compare_skipped) compareSkipped += 1;
    else if (e.compare) compare += 1;
    else solo += 1;
    if (e.cache_hit === true) hits += 1;
    else if (e.cache_hit === false) misses += 1;
    if (e.duration_ms != null) {
      durationSum += e.duration_ms;
      durationCount += 1;
    }
  }

  const known = hits + misses;
  return {
    lookupsServed: events.length,
    countryCount: countriesMap.size,
    countries: [...countriesMap.entries()]
      .map(([countryCode, count]) => ({ countryCode, count }))
      .sort((a, b) => b.count - a.count),
    byPlatform: [...platformMap.entries()]
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count),
    modeSummary: { solo, compare, compareSkipped },
    cacheSummary: {
      hits,
      misses,
      hitRatePct: known ? Math.round((100 * hits) / known) : null,
    },
    avgDurationMs: durationCount
      ? Math.round(durationSum / durationCount)
      : null,
    recent: events,
    recentTotal: events.length,
  };
}

async function dbPrepAdminStatsFromCacheFallback() {
  if (!isSupabaseConfigured()) return emptyPrepAdminStats();
  try {
    const res = await fetch(
      `${supabaseBase()}/rest/v1/prep_form_cache?cache_key=like.${encodeURIComponent(
        `${LOOKUP_CACHE_PREFIX}*`
      )}&select=payload,updated_at&order=updated_at.desc&limit=2000`,
      { headers: supabaseHeaders("return=minimal") }
    );
    if (!res.ok) return emptyPrepAdminStats();
    const rows = await res.json();
    const events = [];
    for (const row of Array.isArray(rows) ? rows : []) {
      const payload = row?.payload;
      if (!payload || typeof payload !== "object") continue;
      if (payload.__type && payload.__type !== "prep_lookup_event") continue;
      const { __type, ...rest } = payload;
      events.push({
        ...rest,
        looked_up_at:
          rest.looked_up_at || row.updated_at || new Date().toISOString(),
      });
    }
    if (!events.length) return emptyPrepAdminStats();
    return aggregatePrepEvents(events);
  } catch {
    return emptyPrepAdminStats();
  }
}

async function dbPrepAdminStats() {
  if (!isSupabaseConfigured()) return emptyPrepAdminStats();
  try {
    const stats = await callRpc("get_admin_prep_stats");
    if (hasPrepData(stats)) return stats;
  } catch {
    /* table/RPC may not be migrated yet */
  }
  return dbPrepAdminStatsFromCacheFallback();
}

/**
 * Prefer dedicated Supabase stats; if empty/missing, keep engine/file fallback.
 */
export async function getPrepAdminStats(fallback = null) {
  if (isSupabaseConfigured()) {
    const stats = await dbPrepAdminStats();
    if (hasPrepData(stats)) return stats;
    if (hasPrepData(fallback)) {
      return { ...emptyPrepAdminStats(), ...fallback };
    }
    return stats;
  }
  if (hasPrepData(fallback)) {
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

async function insertSupabasePrep(row) {
  try {
    await insertPrepLookupEvent(row);
    return { ok: true, via: "supabase" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Table missing / RPC not migrated — fall back to prep_form_cache log.
    if (/prep_lookup_events|does not exist|PGRST/i.test(msg)) {
      try {
        return await insertPrepLookupEventViaCache(row);
      } catch (e2) {
        console.warn(
          "[prepStats] cache fallback failed:",
          e2 instanceof Error ? e2.message : e2
        );
        return { ok: false, reason: msg };
      }
    }
    console.warn("[prepStats] supabase insert failed:", msg.slice(0, 240));
    return { ok: false, reason: msg };
  }
}

/**
 * Persist one successful H2H lookup. Prefer awaiting this on serverless.
 */
export async function recordPrepLookupEvent(row) {
  try {
    const vias = [];

    if (isSupabaseConfigured()) {
      const sb = await insertSupabasePrep(row);
      if (sb.ok) vias.push(sb.via || "supabase");
    }

    // Always try engine when available (admin often reads engine first).
    const engine = await postEnginePrep(row);
    if (engine?.ok) vias.push("engine");

    if (vias.length) return { ok: true, via: vias.join("+") };

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
 * Awaitable helper for analyze handlers — must be awaited on Vercel.
 */
export async function recordPrepLookupFromAnalyze({
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
  return recordPrepLookupEvent(row);
}

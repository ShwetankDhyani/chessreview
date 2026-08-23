/**
 * Site-wide settings (testingMode banner).
 *
 * Persistence:
 * - Vercel / production: engine review-stats.json via GET /stats + POST /stats/admin
 * - Local dev / vitest: data/site-settings.json when EVAL_SERVER_URL is unset
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "fs";
import { join } from "path";

const DATA_DIR = process.env.REVIEW_STATS_DIR ?? join(process.cwd(), "data");
const SETTINGS_FILE = join(DATA_DIR, "site-settings.json");

/** Reserved blog slug — filtered out of public blog listings. */
export const SITE_SETTINGS_SLUG = "cr-site-settings";
const SITE_SETTINGS_TITLE = "ChessReview site settings";

function defaultState() {
  return { testingMode: false };
}

/** @typedef {{ testingMode: boolean, homeGamesNewsSlug?: string | null }} SiteSettingsState */

function normalizeHomeGamesNewsSlug(raw) {
  if (raw === "__auto__") return undefined;
  if (raw === null) return null;
  if (typeof raw !== "string") return undefined;
  const slug = raw.trim();
  return slug || null;
}

function isReadOnlyDeploy() {
  return !!(
    process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME
  );
}

function engineBase() {
  const raw =
    process.env.EVAL_SERVER_URL?.trim() ||
    process.env.VITE_EVAL_SERVER_URL?.trim() ||
    "";
  return raw.replace(/\/$/, "");
}

function loadState() {
  try {
    if (!existsSync(SETTINGS_FILE)) return defaultState();
    const parsed = JSON.parse(readFileSync(SETTINGS_FILE, "utf8"));
    const state = { testingMode: !!parsed.testingMode };
    if ("homeGamesNewsSlug" in parsed) {
      state.homeGamesNewsSlug = normalizeHomeGamesNewsSlug(
        parsed.homeGamesNewsSlug
      );
    }
    return state;
  } catch {
    return defaultState();
  }
}

function saveState(state) {
  mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${SETTINGS_FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
  renameSync(tmp, SETTINGS_FILE);
}

export function fileGetSiteSettings() {
  return serializeSiteSettings(loadState());
}

export function fileSetSiteSettings(patch = {}) {
  const next = { ...loadState() };
  if (typeof patch.testingMode === "boolean") {
    next.testingMode = patch.testingMode;
  }
  if ("homeGamesNewsSlug" in patch) {
    const normalized = normalizeHomeGamesNewsSlug(patch.homeGamesNewsSlug);
    if (normalized === undefined) {
      delete next.homeGamesNewsSlug;
    } else {
      next.homeGamesNewsSlug = normalized;
    }
  }
  saveState(next);
  return serializeSiteSettings(next);
}

export function isSiteSettingsSlug(slug) {
  return String(slug ?? "").trim() === SITE_SETTINGS_SLUG;
}

async function engineFetch(path, options = {}) {
  const base = engineBase();
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
  return { ok: res.ok, status: res.status, data };
}

function parseSiteSettingsPayload(payload) {
  if (!payload || typeof payload !== "object") return null;

  const fromObject = (obj) => {
    if (!obj || typeof obj !== "object") return null;
    const out = {};
    if (typeof obj.testingMode === "boolean") out.testingMode = obj.testingMode;
    if ("homeGamesNewsSlug" in obj) {
      out.homeGamesNewsSlug = normalizeHomeGamesNewsSlug(obj.homeGamesNewsSlug);
    }
    return Object.keys(out).length ? out : null;
  };

  const direct = fromObject(payload);
  if (direct) return direct;

  if (typeof payload.body === "string") {
    try {
      const parsed = fromObject(JSON.parse(payload.body));
      if (parsed) return parsed;
    } catch {
      /* ignore */
    }
  }
  if (payload.post && typeof payload.post.body === "string") {
    try {
      const parsed = fromObject(JSON.parse(payload.post.body));
      if (parsed) return parsed;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function serializeSiteSettings(state) {
  const out = { testingMode: !!state.testingMode };
  if (state.homeGamesNewsSlug !== undefined) {
    out.homeGamesNewsSlug = state.homeGamesNewsSlug;
  }
  return out;
}

async function readFromEngineStats() {
  const res = await engineFetch("/stats");
  if (!res?.ok) return null;
  const parsed = parseSiteSettingsPayload(res.data);
  return parsed ? serializeSiteSettings({ testingMode: false, ...parsed }) : null;
}

async function writeToEngineStats(patch, adminKey) {
  const res = await engineFetch("/stats/admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": adminKey,
    },
    body: JSON.stringify({ action: "site-settings", ...patch }),
  });
  if (!res) return null;
  if (res.status === 401) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  if (!res.ok) return null;
  const parsed = parseSiteSettingsPayload(res.data);
  return parsed
    ? serializeSiteSettings({ testingMode: false, ...parsed })
    : serializeSiteSettings({ testingMode: false, ...patch });
}

export async function getSiteSettings() {
  if (engineBase()) {
    try {
      const fromStats = await readFromEngineStats();
      if (fromStats) return fromStats;
    } catch {
      /* fall through */
    }
    return serializeSiteSettings(defaultState());
  }

  if (!isReadOnlyDeploy()) {
    return serializeSiteSettings(fileGetSiteSettings());
  }
  return serializeSiteSettings(defaultState());
}

function buildSiteSettingsPatch(body = {}) {
  const patch = {};
  if (typeof body.testingMode === "boolean") {
    patch.testingMode = body.testingMode;
  }
  if ("homeGamesNewsSlug" in body) {
    patch.homeGamesNewsSlug =
      body.homeGamesNewsSlug === undefined
        ? undefined
        : normalizeHomeGamesNewsSlug(body.homeGamesNewsSlug);
  }
  if (!Object.keys(patch).length) {
    throw new Error("No site settings fields to update");
  }
  return patch;
}

export async function setSiteSettings(body, adminKey) {
  const expected = (
    process.env.ADMIN_SECRET ??
    process.env.STATS_READ_KEY ??
    ""
  ).trim();
  if (!expected || String(adminKey ?? "").trim() !== expected) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }

  const patch = buildSiteSettingsPatch(body);

  if (engineBase()) {
    try {
      const viaStats = await writeToEngineStats(patch, adminKey);
      if (viaStats) return viaStats;
    } catch (e) {
      if (e?.status === 401) throw e;
    }
    throw new Error(
      "Could not save site settings. Check EVAL_SERVER_URL / analysis server."
    );
  }

  if (!isReadOnlyDeploy()) {
    return fileSetSiteSettings(patch);
  }

  throw new Error(
    "Could not save site settings. Set EVAL_SERVER_URL to your engine tunnel URL on Vercel."
  );
}

function writeJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
  return true;
}

function adminKeyFrom(req) {
  return (
    req.headers?.["x-admin-key"] ??
    String(req.headers?.authorization ?? "").replace(/^Bearer\s+/i, "")
  ).trim();
}

/**
 * Engine routes (legacy alias — testingMode lives in review-stats.json):
 *   GET  /site-settings
 *   POST /site-settings  { testingMode: boolean }  (admin)
 */
export function handleEngineSiteSettingsRequest(
  req,
  res,
  url,
  { readJsonBody, adminSecret }
) {
  if (url.pathname !== "/site-settings") return false;

  if (req.method === "GET") {
    return import("./reviewStatsFile.mjs").then((stats) =>
      writeJson(res, 200, stats.fileGetSiteSettings())
    );
  }

  if (req.method === "POST") {
    const expected = String(adminSecret ?? "").trim();
    const key = adminKeyFrom(req);
    if (!expected || key !== expected) {
      return writeJson(res, 401, { error: "Unauthorized" });
    }
    return readJsonBody(req)
      .then(async (body) => {
        const { fileSetSiteSettings } = await import("./reviewStatsFile.mjs");
        const updated = fileSetSiteSettings(buildSiteSettingsPatch(body));
        writeJson(res, 200, updated);
      })
      .catch((e) => {
        writeJson(res, 400, {
          error: e instanceof Error ? e.message : "Bad request",
        });
      });
  }

  return writeJson(res, 405, { error: "GET or POST only" });
}

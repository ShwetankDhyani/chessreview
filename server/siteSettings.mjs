/**
 * Site-wide settings (testingMode banner + home Games tab news).
 *
 * Persistence:
 * - testingMode: engine review-stats.json via GET /stats + POST /stats/admin
 * - homeGamesNewsSlug: reserved blog post `cr-site-settings` (same pattern as
 *   blog pins) so it works on Vercel even when the analysis engine predates
 *   the homeGamesNewsSlug stats field
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

function normalizeHomeGamesNewsSlug(raw) {
  if (raw === "__auto__") return undefined;
  if (raw === "__none__") return "__none__";
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

function serializeSiteSettings(state) {
  const out = { testingMode: !!state.testingMode };
  if (state.homeGamesNewsSlug !== undefined) {
    out.homeGamesNewsSlug = state.homeGamesNewsSlug;
  }
  return out;
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

async function readFromEngineStats() {
  const res = await engineFetch("/stats");
  if (!res?.ok) return null;
  const parsed = parseSiteSettingsPayload(res.data);
  return parsed ? serializeSiteSettings({ testingMode: false, ...parsed }) : null;
}

async function writeTestingModeToEngineStats(testingMode, adminKey) {
  const res = await engineFetch("/stats/admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": adminKey,
    },
    body: JSON.stringify({ action: "site-settings", testingMode }),
  });
  if (!res) return null;
  if (res.status === 401) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  if (!res.ok) return null;
  const parsed = parseSiteSettingsPayload(res.data);
  return { testingMode: parsed?.testingMode ?? !!testingMode };
}

/**
 * homeGamesNewsSlug is stored in the reserved blog post so older engines
 * (that only understand testingMode in /stats/admin) still persist it.
 */
async function readHomeNewsFromBlog() {
  const res = await engineFetch(`/blog/${SITE_SETTINGS_SLUG}`);
  if (!res?.ok) return null;
  const parsed = parseSiteSettingsPayload(res.data);
  if (!parsed || !("homeGamesNewsSlug" in parsed)) return null;
  return { homeGamesNewsSlug: parsed.homeGamesNewsSlug };
}

async function writeHomeNewsToBlog(homeGamesNewsSlug, adminKey) {
  const base = engineBase();
  if (!base) return null;

  const existing = await engineFetch(`/blog/${SITE_SETTINGS_SLUG}`);
  let current = {};
  if (existing?.ok) {
    current = parseSiteSettingsPayload(existing.data) || {};
  }

  const next = { ...current };
  const normalized = normalizeHomeGamesNewsSlug(homeGamesNewsSlug);
  if (normalized === undefined) {
    delete next.homeGamesNewsSlug;
  } else {
    next.homeGamesNewsSlug = normalized;
  }
  // Keep testingMode out of this doc when possible — stats file owns it.
  // Preserve it if already present so we don't wipe a legacy blog copy.
  const bodyObj = {};
  if (typeof next.testingMode === "boolean") {
    bodyObj.testingMode = next.testingMode;
  }
  if ("homeGamesNewsSlug" in next) {
    bodyObj.homeGamesNewsSlug = next.homeGamesNewsSlug;
  } else {
    // Explicit auto marker so readers can tell "configured auto" vs empty post
    bodyObj.homeGamesNewsSlug = "__auto__";
  }

  const body = JSON.stringify(bodyObj);
  const headers = {
    "Content-Type": "application/json",
    "X-Admin-Key": adminKey,
  };

  if (existing?.ok && existing.data?.post?.id) {
    const res = await engineFetch("/blog", {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "update",
        id: existing.data.post.id,
        title: SITE_SETTINGS_TITLE,
        slug: SITE_SETTINGS_SLUG,
        excerpt: "Internal site settings — hidden from the blog.",
        body,
        published: true,
      }),
    });
    if (res?.status === 401) {
      const err = new Error("Unauthorized");
      err.status = 401;
      throw err;
    }
    if (!res?.ok) {
      throw new Error(
        (res?.data && typeof res.data.error === "string" && res.data.error) ||
          "Could not save home news setting"
      );
    }
  } else {
    const created = await engineFetch("/blog", {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: SITE_SETTINGS_TITLE,
        slug: SITE_SETTINGS_SLUG,
        excerpt: "Internal site settings — hidden from the blog.",
        body,
        published: true,
      }),
    });
    if (created?.status === 401) {
      const err = new Error("Unauthorized");
      err.status = 401;
      throw err;
    }
    if (!created?.ok) {
      throw new Error(
        (created?.data &&
          typeof created.data.error === "string" &&
          created.data.error) ||
          "Could not save home news setting"
      );
    }
  }

  return serializeSiteSettings({
    testingMode: !!next.testingMode,
    homeGamesNewsSlug: normalized,
  });
}

export async function getSiteSettings() {
  if (engineBase()) {
    let testingMode = false;
    let homeGamesNewsSlug;

    try {
      const fromStats = await readFromEngineStats();
      if (fromStats) {
        testingMode = !!fromStats.testingMode;
        if ("homeGamesNewsSlug" in fromStats) {
          homeGamesNewsSlug = fromStats.homeGamesNewsSlug;
        }
      }
    } catch {
      /* fall through */
    }

    try {
      const fromBlog = await readHomeNewsFromBlog();
      if (fromBlog && "homeGamesNewsSlug" in fromBlog) {
        homeGamesNewsSlug = fromBlog.homeGamesNewsSlug;
      }
    } catch {
      /* ignore */
    }

    return serializeSiteSettings({ testingMode, homeGamesNewsSlug });
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
        : body.homeGamesNewsSlug === "__auto__"
          ? "__auto__"
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
    let testingMode = false;
    let homeGamesNewsSlug;

    // Load current values so partial updates return a full snapshot.
    try {
      const current = await getSiteSettings();
      testingMode = !!current.testingMode;
      if ("homeGamesNewsSlug" in current) {
        homeGamesNewsSlug = current.homeGamesNewsSlug;
      }
    } catch {
      /* ignore */
    }

    if (typeof patch.testingMode === "boolean") {
      try {
        const viaStats = await writeTestingModeToEngineStats(
          patch.testingMode,
          adminKey
        );
        if (viaStats) testingMode = !!viaStats.testingMode;
        else {
          throw new Error(
            "Could not save Testing Mode. Check EVAL_SERVER_URL / analysis server."
          );
        }
      } catch (e) {
        if (e?.status === 401) throw e;
        throw e instanceof Error
          ? e
          : new Error(
              "Could not save Testing Mode. Check EVAL_SERVER_URL / analysis server."
            );
      }
    }

    if ("homeGamesNewsSlug" in patch) {
      try {
        const viaBlog = await writeHomeNewsToBlog(
          patch.homeGamesNewsSlug,
          adminKey
        );
        if (viaBlog && "homeGamesNewsSlug" in viaBlog) {
          homeGamesNewsSlug = viaBlog.homeGamesNewsSlug;
        } else {
          homeGamesNewsSlug = undefined;
        }
      } catch (e) {
        if (e?.status === 401) throw e;
        throw e instanceof Error
          ? e
          : new Error("Could not save home Games tab news setting.");
      }
    }

    return serializeSiteSettings({ testingMode, homeGamesNewsSlug });
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
 *   POST /site-settings  { testingMode?: boolean, homeGamesNewsSlug?: ... }
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

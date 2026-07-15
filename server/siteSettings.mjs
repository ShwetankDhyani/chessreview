/**
 * Site-wide settings (testingMode banner).
 *
 * Persistence order:
 * 1) Engine review-stats.json via /stats + POST /stats/admin (preferred)
 * 2) Reserved blog post slug `cr-site-settings` (works on older engines today)
 * 3) Local file store (non-Vercel / local vitest)
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
    return { testingMode: !!parsed.testingMode };
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
  return loadState();
}

export function fileSetSiteSettings(patch = {}) {
  const next = {
    ...loadState(),
    ...(typeof patch.testingMode === "boolean"
      ? { testingMode: patch.testingMode }
      : {}),
  };
  saveState(next);
  return next;
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

function parseTestingMode(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (typeof payload.testingMode === "boolean") return payload.testingMode;
  if (typeof payload.body === "string") {
    try {
      const parsed = JSON.parse(payload.body);
      if (typeof parsed?.testingMode === "boolean") return parsed.testingMode;
    } catch {
      /* ignore */
    }
  }
  if (payload.post && typeof payload.post.body === "string") {
    try {
      const parsed = JSON.parse(payload.post.body);
      if (typeof parsed?.testingMode === "boolean") return parsed.testingMode;
    } catch {
      /* ignore */
    }
  }
  return null;
}

async function readFromEngineStats() {
  const res = await engineFetch("/stats");
  if (!res?.ok) return null;
  const mode = parseTestingMode(res.data);
  return mode == null ? null : { testingMode: mode };
}

async function writeToEngineStats(testingMode, adminKey) {
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
  const mode = parseTestingMode(res.data);
  return { testingMode: mode == null ? !!testingMode : mode };
}

async function writeToEngineSiteSettings(testingMode, adminKey) {
  const res = await engineFetch("/site-settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": adminKey,
    },
    body: JSON.stringify({ testingMode }),
  });
  if (!res) return null;
  if (res.status === 401) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  if (!res.ok) return null;
  return { testingMode: !!res.data?.testingMode };
}

async function readFromBlog() {
  const res = await engineFetch(`/blog/${SITE_SETTINGS_SLUG}`);
  if (!res?.ok) return null;
  const mode = parseTestingMode(res.data);
  return mode == null ? null : { testingMode: mode };
}

async function writeToBlog(testingMode, adminKey) {
  const base = engineBase();
  if (!base) return null;

  const body = JSON.stringify({ testingMode: !!testingMode });
  const headers = {
    "Content-Type": "application/json",
    "X-Admin-Key": adminKey,
  };

  // Update existing reserved post when present.
  const existing = await engineFetch(`/blog/${SITE_SETTINGS_SLUG}`);
  if (existing?.ok && existing.data?.post?.id) {
    const res = await engineFetch("/blog", {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "update",
        id: existing.data.post.id,
        title: SITE_SETTINGS_TITLE,
        slug: SITE_SETTINGS_SLUG,
        excerpt: "Internal site flag — hidden from the blog.",
        body,
        published: true,
      }),
    });
    if (res?.status === 401) {
      const err = new Error("Unauthorized");
      err.status = 401;
      throw err;
    }
    if (res?.ok) return { testingMode: !!testingMode };
  }

  const created = await engineFetch("/blog", {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: SITE_SETTINGS_TITLE,
      slug: SITE_SETTINGS_SLUG,
      excerpt: "Internal site flag — hidden from the blog.",
      body,
      published: true,
    }),
  });
  if (created?.status === 401) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  if (!created?.ok) return null;
  return { testingMode: !!testingMode };
}

export async function getSiteSettings() {
  try {
    const fromStats = await readFromEngineStats();
    if (fromStats) return fromStats;
  } catch {
    /* continue */
  }

  try {
    const fromBlog = await readFromBlog();
    if (fromBlog) return fromBlog;
  } catch {
    /* continue */
  }

  try {
    const res = await engineFetch("/site-settings");
    if (res?.ok) return { testingMode: !!res.data?.testingMode };
  } catch {
    /* continue */
  }

  if (isReadOnlyDeploy() && !engineBase()) {
    return { testingMode: false };
  }
  if (!isReadOnlyDeploy()) {
    return fileGetSiteSettings();
  }
  return { testingMode: false };
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

  const testingMode =
    typeof body?.testingMode === "boolean" ? body.testingMode : undefined;
  if (typeof testingMode !== "boolean") {
    throw new Error("testingMode boolean required");
  }

  try {
    const viaStats = await writeToEngineStats(testingMode, adminKey);
    if (viaStats) return viaStats;
  } catch (e) {
    if (e?.status === 401) throw e;
  }

  try {
    const viaLegacy = await writeToEngineSiteSettings(testingMode, adminKey);
    if (viaLegacy) return viaLegacy;
  } catch (e) {
    if (e?.status === 401) throw e;
  }

  try {
    const viaBlog = await writeToBlog(testingMode, adminKey);
    if (viaBlog) return viaBlog;
  } catch (e) {
    if (e?.status === 401) throw e;
  }

  if (!isReadOnlyDeploy()) {
    return fileSetSiteSettings({ testingMode });
  }

  throw new Error(
    "Could not save Testing Mode. Check EVAL_SERVER_URL / analysis server."
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
 * Engine routes (optional / kept for direct clients):
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
    return writeJson(res, 200, fileGetSiteSettings());
  }

  if (req.method === "POST") {
    const expected = String(adminSecret ?? "").trim();
    const key = adminKeyFrom(req);
    if (!expected || key !== expected) {
      return writeJson(res, 401, { error: "Unauthorized" });
    }
    return readJsonBody(req)
      .then((body) => {
        const updated = fileSetSiteSettings(body ?? {});
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

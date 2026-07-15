/**
 * Site-wide settings (engine file store + Vercel/local helpers).
 * Currently: testingMode banner for visitors.
 *
 * Intentionally self-contained (no reviewStats import) so public/admin
 * stats handlers can attach testingMode without circular deps.
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
    return {
      testingMode: !!parsed.testingMode,
    };
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

async function engineJson(path, options = {}) {
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
  if (!res.ok) {
    const message =
      (data && typeof data.error === "string" && data.error) ||
      `Site settings failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function getSiteSettings() {
  const base = engineBase();
  if (base) {
    try {
      return await engineJson("/site-settings");
    } catch (e) {
      if (isReadOnlyDeploy()) throw e;
    }
  }
  if (isReadOnlyDeploy() && !base) {
    return { testingMode: false };
  }
  return fileGetSiteSettings();
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

  const base = engineBase();
  if (base) {
    return engineJson("/site-settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey,
      },
      body: JSON.stringify(body ?? {}),
    });
  }

  if (isReadOnlyDeploy()) {
    throw new Error(
      "Site settings storage unavailable. Set EVAL_SERVER_URL on Vercel and update the analysis server."
    );
  }
  return fileSetSiteSettings(body ?? {});
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
 * Engine routes:
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

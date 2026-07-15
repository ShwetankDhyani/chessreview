/**
 * Site-wide settings (engine file store).
 * Currently: testingMode banner for visitors.
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

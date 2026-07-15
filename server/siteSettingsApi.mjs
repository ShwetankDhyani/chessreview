/**
 * Site settings API — engine file store with local fallback for non-Vercel.
 */

import { engineStatsUrl } from "./reviewStats.mjs";
import {
  fileGetSiteSettings,
  fileSetSiteSettings,
} from "./siteSettings.mjs";

function isWritableStore() {
  if (process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return false;
  }
  return true;
}

function expectedAdmin() {
  return (process.env.ADMIN_SECRET ?? process.env.STATS_READ_KEY ?? "").trim();
}

async function engineJson(path, options = {}) {
  const base = engineStatsUrl();
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
  const base = engineStatsUrl();
  if (base) {
    try {
      return await engineJson("/site-settings");
    } catch (e) {
      if (!isWritableStore()) throw e;
    }
  }
  if (!isWritableStore() && !base) {
    // Vercel without engine — report off rather than crashing the banner.
    return { testingMode: false };
  }
  return fileGetSiteSettings();
}

export async function setSiteSettings(body, adminKey) {
  const expected = expectedAdmin();
  if (!expected || String(adminKey ?? "").trim() !== expected) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }

  const base = engineStatsUrl();
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

  if (!isWritableStore()) {
    throw new Error(
      "Site settings storage unavailable. Set EVAL_SERVER_URL on Vercel and update the analysis server."
    );
  }
  return fileSetSiteSettings(body ?? {});
}

export function createSiteSettingsMiddleware() {
  return async function siteSettingsMiddleware(req, res, next) {
    try {
      const pathOnly = (req.url || "").split("?")[0];
      if (pathOnly !== "/api/site-settings") return next();

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, X-Admin-Key"
      );

      if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.method === "GET") {
        const data = await getSiteSettings();
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 200;
        res.end(JSON.stringify(data));
        return;
      }

      if (req.method === "POST") {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const raw = Buffer.concat(chunks).toString("utf8");
        const body = raw ? JSON.parse(raw) : {};
        const key = (
          req.headers["x-admin-key"] ??
          String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "")
        ).trim();
        const data = await setSiteSettings(body, key);
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 200;
        res.end(JSON.stringify(data));
        return;
      }

      res.statusCode = 405;
      res.end(JSON.stringify({ error: "GET or POST only" }));
    } catch (e) {
      const status = e?.status === 401 ? 401 : 400;
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: e instanceof Error ? e.message : "Failed",
        })
      );
    }
  };
}

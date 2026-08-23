/**
 * Unified stats API (Hobby plan ≤12 serverless functions).
 * Rewrites keep /api/stats/public|admin|timing working.
 */

import { getAdminStats, getPublicStats, getTimingStats } from "../server/reviewStats.mjs";
import { getSiteSettings, setSiteSettings } from "../server/siteSettings.mjs";

function adminKey(req) {
  return (
    req.headers["x-admin-key"] ??
    String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "")
  ).trim();
}

function kindOf(req) {
  const raw = String(req.query?.kind ?? "public").toLowerCase();
  if (raw === "admin" || raw === "timing" || raw === "public") return raw;
  return "public";
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Key");

  if (req.method === "OPTIONS") return res.status(204).end();

  const kind = kindOf(req);

  try {
    if (kind === "timing") {
      res.setHeader("Cache-Control", "public, max-age=30");
      if (req.method !== "GET") {
        return res.status(405).json({ error: "GET only" });
      }
      const stats = await getTimingStats();
      return res.status(200).json(stats);
    }

    if (kind === "public") {
      res.setHeader("Cache-Control", "no-store");
      if (req.method !== "GET") {
        return res.status(405).json({ error: "GET only" });
      }
      const [stats, settings] = await Promise.all([
        getPublicStats(),
        getSiteSettings().catch(() => ({ testingMode: false })),
      ]);
      return res.status(200).json({
        ...stats,
        testingMode: !!settings?.testingMode,
        ...("homeGamesNewsSlug" in (settings ?? {})
          ? { homeGamesNewsSlug: settings.homeGamesNewsSlug ?? null }
          : {}),
      });
    }

    // admin
    const key = adminKey(req);
    const expected = process.env.ADMIN_SECRET ?? process.env.STATS_READ_KEY;
    if (!expected || key !== expected.trim()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (req.method === "POST") {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
      if (
        body?.action === "site-settings" ||
        typeof body?.testingMode === "boolean" ||
        "homeGamesNewsSlug" in (body ?? {})
      ) {
        const patch = { action: "site-settings" };
        if (typeof body.testingMode === "boolean") {
          patch.testingMode = body.testingMode;
        }
        if ("homeGamesNewsSlug" in body) {
          patch.homeGamesNewsSlug = body.homeGamesNewsSlug;
        }
        const settings = await setSiteSettings(patch, key);
        return res.status(200).json(settings);
      }
      return res.status(400).json({ error: "Unknown admin action" });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ error: "GET or POST only" });
    }

    const stats = await getAdminStats();
    return res.status(200).json(stats);
  } catch (e) {
    const status = e?.status === 401 ? 401 : 500;
    const message = e instanceof Error ? e.message : "Stats failed";
    if (kind === "timing") {
      return res.status(500).json({ error: message, sampleCount: 0 });
    }
    return res.status(status).json({ error: message, configured: false });
  }
}

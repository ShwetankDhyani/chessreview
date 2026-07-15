import { getAdminStats } from "../../server/reviewStats.mjs";
import { setSiteSettings } from "../../server/siteSettings.mjs";

function adminKey(req) {
  return (
    req.headers["x-admin-key"] ??
    String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "")
  ).trim();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Key");

  if (req.method === "OPTIONS") return res.status(204).end();

  const key = adminKey(req);
  const expected = process.env.ADMIN_SECRET ?? process.env.STATS_READ_KEY;

  if (!expected || key !== expected.trim()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Testing Mode toggle — folded into admin stats to stay within Hobby's
    // 12 serverless-function limit (no separate /api/site-settings).
    if (req.method === "POST") {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
      if (
        body?.action === "site-settings" ||
        typeof body?.testingMode === "boolean"
      ) {
        const settings = await setSiteSettings(
          {
            testingMode:
              typeof body.testingMode === "boolean"
                ? body.testingMode
                : undefined,
          },
          key
        );
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
    return res.status(status).json({ error: message, configured: false });
  }
}

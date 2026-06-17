import { getAdminStats, isSupabaseConfigured } from "../../server/reviewStats.mjs";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const key =
    req.headers["x-admin-key"] ??
    req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const expected = process.env.ADMIN_SECRET ?? process.env.STATS_READ_KEY;

  if (!expected || key !== expected) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ configured: false });
  }

  try {
    const stats = await getAdminStats();
    return res.status(200).json({ configured: true, ...stats });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stats failed";
    return res.status(500).json({ error: message });
  }
}

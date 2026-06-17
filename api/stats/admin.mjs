import { getAdminStats } from "../../server/reviewStats.mjs";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const key =
    req.headers["x-admin-key"] ??
    req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const expected = process.env.ADMIN_SECRET ?? process.env.STATS_READ_KEY;

  if (!expected || key.trim() !== expected.trim()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const stats = await getAdminStats();
    return res.status(200).json(stats);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stats failed";
    return res.status(500).json({ error: message, configured: false });
  }
}

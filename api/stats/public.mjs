import { getPublicStats, isSupabaseConfigured } from "../../server/reviewStats.mjs";

export default async function handler(_req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ configured: false });
  }

  try {
    const stats = await getPublicStats();
    return res.status(200).json({ configured: true, ...stats });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stats failed";
    return res.status(500).json({ error: message });
  }
}

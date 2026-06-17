import { getPublicStats } from "../../server/reviewStats.mjs";

export default async function handler(_req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const stats = await getPublicStats();
    return res.status(200).json(stats);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stats failed";
    return res.status(500).json({ error: message, configured: false });
  }
}

import { getTimingStats } from "../../server/reviewStats.mjs";

export default async function handler(_req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=30");

  try {
    const stats = await getTimingStats();
    return res.status(200).json(stats);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Timing stats failed";
    return res.status(500).json({ error: message, sampleCount: 0 });
  }
}

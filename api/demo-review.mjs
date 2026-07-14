import { getDemoReview } from "../server/demoReviewApi.mjs";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "GET only" });
  }

  try {
    const row = await getDemoReview();
    if (!row) return res.status(404).json({ error: "Demo review not ready" });
    return res.status(200).json(row);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Demo review failed";
    return res.status(500).json({ error: message });
  }
}

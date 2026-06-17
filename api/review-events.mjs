import {
  geoFromHeaders,
  normalizeReviewPayload,
  recordReviewEvent,
} from "../server/reviewStats.mjs";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body ?? {};
    const row = normalizeReviewPayload(body, geoFromHeaders(req.headers));
    if (!row.run_id) {
      return res.status(400).json({ error: "Missing runId" });
    }
    const result = await recordReviewEvent(row);
    if (result?.ok === false && result.reason === "not_configured") {
      return res.status(503).json(result);
    }
    return res.status(200).json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid payload";
    return res.status(400).json({ error: message });
  }
}

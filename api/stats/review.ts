import type { VercelRequest, VercelResponse } from "@vercel/node";
import { insertCompletedReview } from "../../lib/review-stats.js";
import { isSupabaseConfigured } from "../../lib/supabase.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: "Stats database not configured" });
  }

  const body = req.body ?? {};
  const depth = Number(body.depth);
  const durationMs = Number(body.durationMs);

  if (!Number.isFinite(depth) || depth < 1 || depth > 30) {
    return res.status(400).json({ error: "Invalid depth" });
  }
  if (!Number.isFinite(durationMs) || durationMs < 1000) {
    return res.status(400).json({ error: "Invalid durationMs" });
  }

  try {
    await insertCompletedReview(req, {
      username: body.username ?? null,
      white: body.white,
      black: body.black,
      plies: body.plies,
      depth,
      durationMs,
      timezone: body.timezone ?? null,
      locale: body.locale ?? null,
    });

    return res.status(201).json({ ok: true });
  } catch (e) {
    console.error("[api/stats/review]", e);
    return res.status(500).json({ error: "Failed to record review" });
  }
}

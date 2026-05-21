import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getPublicReviewStats,
  getReviewStatsSummary,
} from "../lib/review-stats.js";
import { isSupabaseConfigured } from "../lib/supabase.js";

function readKey(req: VercelRequest): string | null {
  const auth = req.headers.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    return auth.slice(7).trim();
  }
  const q = req.query.key;
  if (typeof q === "string" && q.trim()) return q.trim();
  return null;
}

function canReadFullStats(req: VercelRequest): boolean {
  const expected = process.env.STATS_READ_KEY?.trim();
  if (!expected) return false;
  const key = readKey(req);
  return Boolean(key && key === expected);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: "Stats database not configured" });
  }

  try {
    if (!canReadFullStats(req)) {
      const publicStats = await getPublicReviewStats();
      return res.status(200).json(publicStats);
    }

    const country =
      typeof req.query.country === "string" ? req.query.country : undefined;
    const depthRaw = req.query.depth;
    const depth =
      typeof depthRaw === "string" && depthRaw
        ? parseInt(depthRaw, 10)
        : undefined;
    const from =
      typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    const limitRaw = req.query.limit;
    const limit =
      typeof limitRaw === "string" ? parseInt(limitRaw, 10) : 100;

    const summary = await getReviewStatsSummary({
      country,
      depth: Number.isFinite(depth) ? depth : undefined,
      from,
      to,
      limit: Number.isFinite(limit) ? limit : 100,
    });

    return res.status(200).json(summary);
  } catch (e) {
    console.error("[api/stats]", e);
    return res.status(500).json({ error: "Failed to load stats" });
  }
}

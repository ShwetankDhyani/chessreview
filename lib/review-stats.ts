import type { VercelRequest } from "@vercel/node";
import { geoFromRequest } from "./geo.js";
import { getSupabaseAdmin } from "./supabase.js";

export interface ReviewRecordBody {
  username?: string | null;
  white?: string;
  black?: string;
  plies?: number;
  depth: number;
  durationMs: number;
  timezone?: string | null;
  locale?: string | null;
}

export interface StatsFilters {
  country?: string;
  depth?: number;
  from?: string;
  to?: string;
  limit?: number;
}

export async function insertCompletedReview(
  req: VercelRequest,
  body: ReviewRecordBody
) {
  const geo = geoFromRequest(req);
  const supabase = getSupabaseAdmin();

  const row = {
    username: body.username?.trim() || null,
    white_player: (body.white?.trim() || "Unknown").slice(0, 120),
    black_player: (body.black?.trim() || "Unknown").slice(0, 120),
    plies:
      typeof body.plies === "number" && body.plies >= 0
        ? Math.floor(body.plies)
        : null,
    depth: Math.floor(body.depth),
    duration_ms: Math.floor(body.durationMs),
    country_code: geo.countryCode,
    region: geo.region,
    city: geo.city,
    latitude: geo.latitude,
    longitude: geo.longitude,
    timezone: body.timezone?.trim()?.slice(0, 80) ?? null,
    locale: body.locale?.trim()?.slice(0, 40) ?? null,
    client_ip: geo.clientIp,
  };

  const { error } = await supabase.from("review_events").insert(row);
  if (error) throw error;
}

export async function getReviewStatsSummary(filters: StatsFilters = {}) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("get_review_stats_summary", {
    filter_country: filters.country ?? null,
    filter_depth: filters.depth ?? null,
    filter_from: filters.from ?? null,
    filter_to: filters.to ?? null,
    recent_limit: filters.limit ?? 100,
  });

  if (error) throw error;
  return data as Record<string, unknown>;
}

export interface PublicReviewStats {
  matchesReviewed: number;
  countryCount: number;
  reviewsByDate: Array<{ date: string; count: number }>;
}

export async function getPublicReviewStats(): Promise<PublicReviewStats> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("get_public_review_stats");
  if (error) throw error;

  const raw = data as Record<string, unknown>;
  const byDate = Array.isArray(raw.reviewsByDate) ? raw.reviewsByDate : [];

  return {
    matchesReviewed:
      typeof raw.matchesReviewed === "number" ? raw.matchesReviewed : 0,
    countryCount: typeof raw.countryCount === "number" ? raw.countryCount : 0,
    reviewsByDate: byDate
      .map((row) => {
        const r = row as Record<string, unknown>;
        return {
          date: String(r.date ?? ""),
          count: typeof r.count === "number" ? r.count : 0,
        };
      })
      .filter((r) => r.date),
  };
}

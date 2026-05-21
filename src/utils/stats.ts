/** Cloud review stats (Supabase via Vercel /api) */

const STATS_GET = "/api/stats";
const STATS_REVIEW = "/api/stats/review";

export const STATS_REFRESH = "cr-stats-refresh";

export interface ReviewCompletedPayload {
  username?: string | null;
  white: string;
  black: string;
  plies: number;
  depth: number;
  durationMs: number;
}

export interface PublicReviewStats {
  matchesReviewed: number;
  countryCount: number;
  reviewsByDate: Array<{ date: string; count: number }>;
}

export function recordReviewCompleted(payload: ReviewCompletedPayload) {
  const body = {
    ...payload,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: navigator.language,
  };

  void fetch(STATS_REVIEW, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  })
    .then((res) => {
      if (res.ok) window.dispatchEvent(new Event(STATS_REFRESH));
    })
    .catch(() => {});
}

export async function fetchPublicStats(): Promise<PublicReviewStats | null> {
  try {
    const res = await fetch(STATS_GET);
    if (!res.ok) return null;
    const data = (await res.json()) as PublicReviewStats;
    if (typeof data.matchesReviewed !== "number") return null;
    return {
      matchesReviewed: data.matchesReviewed,
      countryCount: data.countryCount ?? 0,
      reviewsByDate: Array.isArray(data.reviewsByDate) ? data.reviewsByDate : [],
    };
  } catch {
    return null;
  }
}

export interface DepthStat {
  depth: number;
  count: number;
  avgDurationMs: number;
}

export interface CountryStat {
  countryCode: string;
  count: number;
}

export interface LocationStat {
  countryCode: string;
  region: string | null;
  city: string | null;
  count: number;
}

export interface RecentReview {
  id: string;
  reviewedAt: string;
  username: string | null;
  white: string;
  black: string;
  plies: number | null;
  depth: number;
  durationMs: number;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  locale: string | null;
}

export interface FullStatsSummary {
  matchesReviewed: number;
  byDepth: DepthStat[];
  byCountry: CountryStat[];
  byLocation: LocationStat[];
  recentReviews: RecentReview[];
}

export async function fetchFullStats(
  readKey: string,
  filters?: { country?: string; depth?: number; from?: string; to?: string; limit?: number }
): Promise<FullStatsSummary | null> {
  const params = new URLSearchParams();
  if (filters?.country) params.set("country", filters.country);
  if (filters?.depth != null) params.set("depth", String(filters.depth));
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  if (filters?.limit != null) params.set("limit", String(filters.limit));

  const qs = params.toString();
  const url = qs ? `${STATS_GET}?${qs}` : STATS_GET;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${readKey}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as FullStatsSummary;
  } catch {
    return null;
  }
}

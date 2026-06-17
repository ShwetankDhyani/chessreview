export interface CountryStat {
  countryCode: string;
  count: number;
}

export interface PublicReviewStats {
  configured: boolean;
  reviewsServed?: number;
  liveReviews?: number;
  baseline?: number;
  countryCount?: number;
  countries?: CountryStat[];
  tracking?: "none" | "baseline_only" | "live" | "live+baseline";
}

export interface RecentReviewRow {
  reviewed_at: string;
  username: string | null;
  reviewer_platform: string | null;
  white_player: string;
  black_player: string;
  white_rating: number | null;
  black_rating: number | null;
  result: string | null;
  plies: number | null;
  depth: number;
  duration_ms: number;
  country_code: string | null;
  region: string | null;
  city: string | null;
  source: string | null;
}

export interface DepthStat {
  depth: number;
  count: number;
  avgDurationMs: number;
}

export interface AdminReviewStats extends PublicReviewStats {
  byDepth?: DepthStat[];
  ratingSummary?: {
    avgWhite: number | null;
    avgBlack: number | null;
    ratedGames: number;
  };
  recent?: RecentReviewRow[];
}

const regionNames =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

export function countryLabel(code: string | null | undefined): string {
  if (!code) return "Unknown";
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

export function formatReviewsServed(n: number): string {
  return n.toLocaleString();
}

export async function fetchReviewCount(): Promise<number> {
  const engineUrl = import.meta.env.VITE_EVAL_SERVER_URL?.replace(/\/$/, "");
  const sources = [
    "/api/stats/public",
    engineUrl ? `${engineUrl}/stats` : null,
  ].filter(Boolean) as string[];

  for (const url of sources) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const count = data.count ?? data.reviewsServed;
      if (typeof count === "number") return count;
    } catch {
      /* try next source */
    }
  }
  return 0;
}

export async function fetchAdminStats(adminKey: string): Promise<AdminReviewStats> {
  const res = await fetch("/api/stats/admin", {
    headers: { "X-Admin-Key": adminKey },
  });
  if (res.status === 401) {
    throw new Error("Invalid admin key");
  }
  if (!res.ok) {
    throw new Error("Could not load admin stats");
  }
  return res.json();
}

export interface RecordReviewInput {
  runId: string;
  username?: string | null;
  reviewerPlatform?: string | null;
  whitePlayer: string;
  blackPlayer: string;
  whiteRating?: number | null;
  blackRating?: number | null;
  result?: string | null;
  plies: number;
  depth: number;
  durationMs: number;
  source?: string | null;
}

export function recordReviewCompleted(input: RecordReviewInput): void {
  const payload = {
    runId: input.runId,
    username: input.username ?? null,
    reviewerPlatform: input.reviewerPlatform ?? null,
    whitePlayer: input.whitePlayer,
    blackPlayer: input.blackPlayer,
    whiteRating: input.whiteRating ?? null,
    blackRating: input.blackRating ?? null,
    result: input.result ?? null,
    plies: input.plies,
    depth: input.depth,
    durationMs: input.durationMs,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: navigator.language,
    source: input.source ?? null,
  };

  const engineUrl = import.meta.env.VITE_EVAL_SERVER_URL?.replace(/\/$/, "");
  const targets = ["/api/review-events"];
  if (engineUrl) targets.push(`${engineUrl}/stats/review`);

  for (const url of targets) {
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      /* analytics must never block or surface errors */
    });
  }
}

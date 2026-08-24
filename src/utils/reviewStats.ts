import { fetchWithTimeout } from "./netRetry";
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

export interface SavedGamesByUser {
  platform: string;
  username: string;
  count: number;
  lastSavedAt: number;
}

export interface SavedGamesSummary {
  total: number;
  byUser: SavedGamesByUser[];
}

export interface AdminReviewStats extends PublicReviewStats {
  byDepth?: DepthStat[];
  ratingSummary?: {
    avgWhite: number | null;
    avgBlack: number | null;
    ratedGames: number;
  };
  /** Full review history (newest first). */
  recent?: RecentReviewRow[];
  recentTotal?: number;
  savedGames?: SavedGamesSummary;
}

/** Public Chess.com / Lichess profile URL for a linked reviewer account. */
export function chessProfileUrl(
  platform: string | null | undefined,
  username: string | null | undefined
): string | null {
  const name = username?.trim();
  if (!name) return null;
  const p = String(platform ?? "").toLowerCase();
  if (p === "chesscom" || p === "chess.com") {
    return `https://www.chess.com/member/${encodeURIComponent(name)}`;
  }
  if (p === "lichess") {
    return `https://lichess.org/@/${encodeURIComponent(name)}`;
  }
  return null;
}

export function platformLabel(platform: string | null | undefined): string {
  const p = String(platform ?? "").toLowerCase();
  if (p === "chesscom" || p === "chess.com") return "Chess.com";
  if (p === "lichess") return "Lichess";
  return platform?.trim() || "—";
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

export async function fetchPublicReviewStats(): Promise<{
  count: number;
  countryCount: number;
}> {
  const engineUrl = import.meta.env.VITE_EVAL_SERVER_URL?.replace(/\/$/, "");
  const sources = [
    "/api/stats/public",
    engineUrl ? `${engineUrl}/stats` : null,
  ].filter(Boolean) as string[];

  for (const url of sources) {
    try {
      const res = await fetchWithTimeout(url, undefined, 10_000);
      if (!res.ok) continue;
      const data = await res.json();
      const count = data.count ?? data.reviewsServed;
      if (typeof count !== "number") continue;
      const countryCount =
        typeof data.countryCount === "number" ? data.countryCount : 0;
      return { count, countryCount };
    } catch {
      /* try next source */
    }
  }
  return { count: 0, countryCount: 0 };
}

export async function fetchReviewCount(): Promise<number> {
  const { count } = await fetchPublicReviewStats();
  return count;
}

export async function fetchAdminStats(adminKey: string): Promise<AdminReviewStats> {
  const trimmed = adminKey.trim();
  const engineUrl = import.meta.env.VITE_EVAL_SERVER_URL?.replace(/\/$/, "");
  const sources: Array<{ url: string; label: string }> = [
    { url: "/api/stats/admin", label: "vercel" },
  ];
  if (engineUrl) {
    sources.push({ url: `${engineUrl}/stats/admin`, label: "engine" });
  }

  let sawUnauthorized = false;

  for (const { url } of sources) {
    try {
      const res = await fetchWithTimeout(
        url,
        { headers: { "X-Admin-Key": trimmed } },
        15_000
      );
      if (res.status === 401) {
        sawUnauthorized = true;
        continue;
      }
      if (!res.ok) continue;
      return res.json();
    } catch {
      continue;
    }
  }

  if (sawUnauthorized) {
    throw new Error("Invalid admin key");
  }
  throw new Error("Could not load admin stats");
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
  void recordReviewCompletedAsync(input);
}

async function recordReviewCompletedAsync(input: RecordReviewInput): Promise<void> {
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

  const postOpts: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  };

  // Vercel adds geo headers; forward to engine with country in body.
  try {
    const res = await fetchWithTimeout("/api/review-events", postOpts, 8_000);
    if (res.ok) return;
  } catch {
    /* fall through to engine */
  }

  const engineUrl = import.meta.env.VITE_EVAL_SERVER_URL?.replace(/\/$/, "");
  if (!engineUrl) return;

  try {
    await fetchWithTimeout(`${engineUrl}/stats/review`, postOpts, 8_000);
  } catch {
    /* analytics must never block or surface errors */
  }
}

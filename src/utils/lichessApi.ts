import type { GameListItem } from "../types";
import {
  NotFoundError,
  retryingFetch,
  type RetryingFetchOptions,
} from "./netRetry";

interface LichessGame {
  id: string;
  rated: boolean;
  speed: string;
  createdAt: number;
  lastMoveAt: number;
  status: string;
  pgn?: string;
  players: {
    white: { user?: { name: string }; rating?: number; ratingDiff?: number };
    black: { user?: { name: string }; rating?: number; ratingDiff?: number };
  };
  winner?: "white" | "black";
}

/**
 * Budget for the whole game-list fetch. The previous 5s was routinely too
 * short: 100 games with embedded PGNs is a multi-megabyte NDJSON stream, so
 * ordinary connections timed out even though the request was healthy.
 */
export const LICHESS_GAMES_TIMEOUT_MS = 25_000;
export const LICHESS_USER_TIMEOUT_MS = 10_000;

const LICHESS_MAX_GAMES = 100;

function gamesUrl(username: string, max: number): string {
  const params = new URLSearchParams({
    max: String(max),
    pgnInJson: "true",
    clocks: "false",
    evals: "false",
    opening: "false",
    perfType: "bullet,blitz,rapid,classical",
  });
  return `https://lichess.org/api/games/user/${encodeURIComponent(
    username
  )}?${params.toString()}`;
}

/**
 * Read NDJSON incrementally.
 *
 * Parsing as the stream arrives means a connection that drops partway still
 * yields the games already received, instead of discarding everything.
 */
async function readNdjsonGames(
  res: Response,
  signal?: AbortSignal | null
): Promise<LichessGame[]> {
  const games: LichessGame[] = [];

  const pushLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      games.push(JSON.parse(trimmed) as LichessGame);
    } catch {
      // Truncated or partial trailing line — keep what already parsed.
    }
  };

  const body = res.body;
  if (!body || typeof body.getReader !== "function") {
    const text = await res.text();
    for (const line of text.split("\n")) pushLine(line);
    return games;
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const abortRead = () => void reader.cancel().catch(() => {});
  signal?.addEventListener("abort", abortRead, { once: true });

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineAt = buffer.indexOf("\n");
      while (newlineAt !== -1) {
        pushLine(buffer.slice(0, newlineAt));
        buffer = buffer.slice(newlineAt + 1);
        newlineAt = buffer.indexOf("\n");
      }
    }
    buffer += decoder.decode();
    pushLine(buffer);
  } catch {
    // Stream failed mid-flight; fall through with whatever parsed cleanly.
  } finally {
    signal?.removeEventListener("abort", abortRead);
  }

  return games;
}

function toGameListItems(games: LichessGame[]): GameListItem[] {
  return games
    .filter((g) => g.pgn)
    .map((g, idx) => {
      const wName = g.players.white.user?.name ?? "?";
      const bName = g.players.black.user?.name ?? "?";

      let whiteResult = "unknown";
      let blackResult = "unknown";
      if (g.winner === "white") {
        whiteResult = "win";
        blackResult = "checkmated";
      } else if (g.winner === "black") {
        blackResult = "win";
        whiteResult = "checkmated";
      } else if (!g.winner && g.status !== "aborted") {
        whiteResult = "draw";
        blackResult = "draw";
      }

      return {
        id: `${g.id}_${idx}`,
        pgn: g.pgn ?? "",
        white: wName,
        black: bName,
        whiteRating: g.players.white.rating ?? 0,
        blackRating: g.players.black.rating ?? 0,
        whiteResult,
        blackResult,
        timeClass: g.speed,
        endTime: Math.floor(g.lastMoveAt / 1000),
      } satisfies GameListItem;
    });
}

export interface LichessFetchOptions {
  signal?: AbortSignal | null;
  timeoutMs?: number;
  max?: number;
  onRetry?: RetryingFetchOptions["onRetry"];
}

export async function fetchLichessGames(
  username: string,
  options: LichessFetchOptions = {}
): Promise<GameListItem[]> {
  const {
    signal,
    timeoutMs = LICHESS_GAMES_TIMEOUT_MS,
    max = LICHESS_MAX_GAMES,
    onRetry,
  } = options;

  // Lichess usernames are case-insensitive; normalizing keeps the games,
  // profile and stats endpoints consistent with each other.
  const name = username.trim().toLowerCase();
  if (!name) throw new NotFoundError("Lichess username is empty");

  const res = await retryingFetch(gamesUrl(name, max), {
    headers: { Accept: "application/x-ndjson" },
    cache: "no-store",
    timeoutMs,
    attempts: 4,
    baseBackoffMs: 700,
    maxBackoffMs: 6_000,
    signal,
    notFoundStatuses: [400, 404],
    notFoundMessage: `Player "${username}" not found on Lichess`,
    onRetry,
  });

  const games = await readNdjsonGames(res, signal);
  return toGameListItems(games);
}

export interface LichessPerfs {
  bullet?: number;
  blitz?: number;
  rapid?: number;
}

/** Ratings for the profile header. Throws typed errors; callers may ignore. */
export async function fetchLichessPlayerStats(
  username: string,
  options: { signal?: AbortSignal | null; timeoutMs?: number } = {}
): Promise<LichessPerfs | null> {
  const { signal, timeoutMs = LICHESS_USER_TIMEOUT_MS } = options;
  const name = username.trim().toLowerCase();
  if (!name) return null;

  const res = await retryingFetch(
    `https://lichess.org/api/user/${encodeURIComponent(name)}`,
    {
      headers: { Accept: "application/json" },
      cache: "no-store",
      timeoutMs,
      attempts: 3,
      baseBackoffMs: 600,
      maxBackoffMs: 4_000,
      signal,
      notFoundStatuses: [404],
      notFoundMessage: `Player "${username}" not found on Lichess`,
    }
  );

  const data = await res.json();
  return {
    bullet: data?.perfs?.bullet?.rating,
    blitz: data?.perfs?.blitz?.rating,
    rapid: data?.perfs?.rapid?.rating,
  };
}

/** Existence check used when adding a profile. */
export async function lichessUserExists(
  username: string,
  options: { signal?: AbortSignal | null; timeoutMs?: number } = {}
): Promise<boolean> {
  await fetchLichessPlayerStats(username, options);
  return true;
}

import type { ChessComGame, GameListItem } from "../types";
import {
  chesscomArchivesUrl,
  chesscomFetch,
  chesscomMonthGamesUrl,
  chesscomPlayerStatsUrl,
} from "./chesscomClient";
import {
  Deadline,
  HttpStatusError,
  NotFoundError,
  parseRetryAfterMs,
} from "./netRetry";

/** Total budget for a game-list load, shared across archives + month fetches. */
export const CHESSCOM_GAMES_TIMEOUT_MS = 30_000;
export const CHESSCOM_STATS_TIMEOUT_MS = 8_000;

/** Newest archive months to scan before giving up on reaching `limit`. */
const MAX_ARCHIVE_MONTHS = 6;
/** Leave room for at least one month request after listing archives. */
const ARCHIVES_TIMEOUT_MS = 12_000;

function mapGames(games: ChessComGame[]): GameListItem[] {
  return games
    .filter((g) => g.rules === "chess" && g.pgn)
    .sort((a, b) => b.end_time - a.end_time)
    .map((g, idx) => ({
      id: `${g.end_time}_${idx}`,
      pgn: g.pgn,
      white: g.white.username,
      black: g.black.username,
      whiteRating: g.white.rating,
      blackRating: g.black.rating,
      whiteResult: g.white.result,
      blackResult: g.black.result,
      timeClass: g.time_class,
      endTime: g.end_time,
    }));
}

/** Turn a non-OK Chess.com response into a typed, classifiable error. */
function statusError(res: Response, context: string): HttpStatusError {
  return new HttpStatusError(
    res.status,
    `Chess.com ${context} responded ${res.status}`,
    parseRetryAfterMs(res.headers.get("Retry-After"))
  );
}

export interface ChesscomFetchOptions {
  signal?: AbortSignal | null;
  timeoutMs?: number;
}

export async function fetchMonthGames(
  username: string,
  year: number,
  month: number,
  options: ChesscomFetchOptions = {}
): Promise<GameListItem[]> {
  const url = chesscomMonthGamesUrl(username, year, month);
  const res = await chesscomFetch(url, {
    signal: options.signal ?? undefined,
    timeoutMs: options.timeoutMs,
  });

  if (!res.ok) {
    // 404/410 mean "this month has no archive", which is a normal empty result.
    if (res.status === 404 || res.status === 410) return [];
    throw statusError(res, "month archive");
  }

  const data: { games: ChessComGame[] } = await res.json();
  return mapGames(data.games ?? []);
}

/** List archive month URLs (newest last from API). */
async function fetchArchiveUrls(
  username: string,
  options: ChesscomFetchOptions = {}
): Promise<string[]> {
  const res = await chesscomFetch(chesscomArchivesUrl(username), {
    signal: options.signal ?? undefined,
    timeoutMs: options.timeoutMs,
  });
  if (res.status === 404) {
    throw new NotFoundError(`Player "${username}" not found on Chess.com`);
  }
  if (!res.ok) throw statusError(res, "archives");

  const data: { archives?: string[] } = await res.json();
  return Array.isArray(data.archives) ? data.archives : [];
}

export interface FetchRecentGamesOptions extends ChesscomFetchOptions {
  limit?: number;
}

/**
 * Newest games across recent archive months.
 *
 * Months are fetched newest-first and stop early once `limit` is reached.
 * Per-month failures used to be skipped silently, which surfaced upstream
 * outages as "this account has no games". Now a month failure is only tolerated
 * when some other month succeeded; if every month fails the error propagates.
 */
export async function fetchRecentGames(
  username: string,
  options: FetchRecentGamesOptions | number = {}
): Promise<GameListItem[]> {
  const opts: FetchRecentGamesOptions =
    typeof options === "number" ? { limit: options } : options;
  const {
    limit = 100,
    signal,
    timeoutMs = CHESSCOM_GAMES_TIMEOUT_MS,
  } = opts;

  const name = username.trim();
  if (!name) throw new NotFoundError("Chess.com username is empty");

  const deadline = new Deadline(timeoutMs);

  const archives = await fetchArchiveUrls(name, {
    signal,
    timeoutMs: Math.min(ARCHIVES_TIMEOUT_MS, deadline.remainingMs),
  });

  const recent = archives.slice(-MAX_ARCHIVE_MONTHS).reverse();
  const collected: GameListItem[] = [];
  let monthFailure: unknown = null;
  let monthsAttempted = 0;
  let monthsSucceeded = 0;

  for (const archiveUrl of recent) {
    if (collected.length >= limit) break;
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    // Stop cleanly rather than letting the last month blow the budget.
    if (deadline.remainingMs <= 1_000) break;

    monthsAttempted++;
    try {
      const res = await chesscomFetch(archiveUrl, {
        signal: signal ?? undefined,
        timeoutMs: deadline.remainingMs,
      });
      if (!res.ok) {
        if (res.status !== 404 && res.status !== 410) {
          monthFailure = statusError(res, "month archive");
        }
        continue;
      }
      const data: { games?: ChessComGame[] } = await res.json();
      collected.push(...mapGames(data.games ?? []));
      monthsSucceeded++;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      monthFailure = error;
    }
  }

  // Every attempted month failed — that is an outage, not an empty account.
  if (monthsAttempted > 0 && monthsSucceeded === 0 && monthFailure) {
    throw monthFailure;
  }

  // Archives listing was empty (brand-new account, or an upstream hiccup):
  // walk the calendar as a fallback before concluding there are no games.
  if (collected.length === 0 && recent.length === 0) {
    const now = new Date();
    let fallbackFailure: unknown = null;
    let fallbackSucceeded = 0;

    for (let i = 0; i < MAX_ARCHIVE_MONTHS && collected.length < limit; i++) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      if (deadline.remainingMs <= 1_000) break;

      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      try {
        const batch = await fetchMonthGames(
          name,
          d.getFullYear(),
          d.getMonth() + 1,
          { signal, timeoutMs: deadline.remainingMs }
        );
        collected.push(...batch);
        fallbackSucceeded++;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        fallbackFailure = error;
      }
    }

    if (fallbackSucceeded === 0 && fallbackFailure) throw fallbackFailure;
  }

  return collected.sort((a, b) => b.endTime - a.endTime).slice(0, limit);
}

export async function fetchChesscomPlayerStats(
  username: string,
  options: ChesscomFetchOptions = {}
): Promise<{
  bullet?: number;
  blitz?: number;
  rapid?: number;
} | null> {
  const res = await chesscomFetch(chesscomPlayerStatsUrl(username), {
    signal: options.signal ?? undefined,
    timeoutMs: options.timeoutMs ?? CHESSCOM_STATS_TIMEOUT_MS,
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    bullet: data.chess_bullet?.last?.rating,
    blitz: data.chess_blitz?.last?.rating,
    rapid: data.chess_rapid?.last?.rating,
  };
}

export function getResultLabel(
  result: string,
  color: "white" | "black",
  game: GameListItem
): "win" | "loss" | "draw" {
  const myResult = color === "white" ? game.whiteResult : game.blackResult;
  if (myResult === "win") return "win";
  if (
    ["checkmated", "timeout", "resigned", "abandoned", "lose"].includes(
      myResult
    )
  )
    return "loss";
  return "draw";
}

export function formatDate(unixTs: number): string {
  return new Date(unixTs * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

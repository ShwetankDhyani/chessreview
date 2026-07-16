import type { ChessComGame, GameListItem } from "../types";
import {
  chesscomArchivesUrl,
  chesscomFetch,
  chesscomMonthGamesUrl,
  chesscomPlayerStatsUrl,
} from "./chesscomClient";

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

export async function fetchMonthGames(
  username: string,
  year: number,
  month: number
): Promise<GameListItem[]> {
  const url = chesscomMonthGamesUrl(username, year, month);
  const res = await chesscomFetch(url);

  if (!res.ok) {
    if (res.status === 404) return [];
    if (res.status === 410) return [];
    throw new Error(`Chess.com API error: ${res.status}`);
  }

  const data: { games: ChessComGame[] } = await res.json();
  return mapGames(data.games ?? []);
}

/** List archive month URLs (newest last from API). */
async function fetchArchiveUrls(username: string): Promise<string[]> {
  const res = await chesscomFetch(chesscomArchivesUrl(username));
  if (res.status === 404) {
    throw new Error(`Player "${username}" not found on Chess.com`);
  }
  if (!res.ok) {
    throw new Error(`Chess.com archives error: ${res.status}`);
  }
  const data: { archives?: string[] } = await res.json();
  return data.archives ?? [];
}

export async function fetchRecentGames(
  username: string,
  limit = 100
): Promise<GameListItem[]> {
  const archives = await fetchArchiveUrls(username.trim());
  // Prefer real archive months (avoids hammering empty months).
  const recent = archives.slice(-6).reverse();
  const collected: GameListItem[] = [];

  for (const archiveUrl of recent) {
    if (collected.length >= limit) break;
    const res = await chesscomFetch(archiveUrl);
    if (!res.ok) continue;
    const data: { games?: ChessComGame[] } = await res.json();
    collected.push(...mapGames(data.games ?? []));
  }

  // Fallback if archives empty/unavailable: walk calendar months politely.
  if (collected.length === 0) {
    const now = new Date();
    for (let i = 0; i < 6 && collected.length < limit; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const batch = await fetchMonthGames(
        username,
        d.getFullYear(),
        d.getMonth() + 1
      ).catch(() => []);
      collected.push(...batch);
    }
  }

  return collected.sort((a, b) => b.endTime - a.endTime).slice(0, limit);
}

export async function fetchChesscomPlayerStats(username: string): Promise<{
  bullet?: number;
  blitz?: number;
  rapid?: number;
} | null> {
  const res = await chesscomFetch(chesscomPlayerStatsUrl(username));
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

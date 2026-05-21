import type { ChessComGame, GameListItem } from "../types";

export async function fetchMonthGames(
  username: string,
  year: number,
  month: number
): Promise<GameListItem[]> {
  const mm = String(month).padStart(2, "0");
  const url = `https://api.chess.com/pub/player/${username.toLowerCase()}/games/${year}/${mm}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "ChessReviewApp/1.0" },
  });

  if (!res.ok) {
    if (res.status === 404)
      throw new Error(`Player "${username}" not found on Chess.com`);
    throw new Error(`Chess.com API error: ${res.status}`);
  }

  const data: { games: ChessComGame[] } = await res.json();
  const games = data.games ?? [];

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

export async function fetchRecentGames(
  username: string,
  limit = 100
): Promise<GameListItem[]> {
  const collected: GameListItem[] = [];
  const now = new Date();

  // Walk backwards month by month until we have enough games (up to 6 months back)
  for (let i = 0; i < 6 && collected.length < limit; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const batch = await fetchMonthGames(username, d.getFullYear(), d.getMonth() + 1).catch(() => []);
    collected.push(...batch);
  }

  return collected
    .sort((a, b) => b.endTime - a.endTime)
    .slice(0, limit);
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

/** @deprecated Use TimeClassIcon component for consistent rendering */
export function timeClassIcon(tc: string): string {
  if (tc === "bullet") return "⚡";
  if (tc === "blitz") return "🔥";
  if (tc === "rapid") return "⏱";
  if (tc === "daily") return "📅";
  return "♟";
}

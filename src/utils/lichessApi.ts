import type { GameListItem } from "../types";

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

async function fetchLichessGamesOnce(username: string): Promise<Response> {
  const url = `https://lichess.org/api/games/user/${encodeURIComponent(username)}?max=100&pgnInJson=true&clocks=false&evals=false&opening=false&perfType=bullet,blitz,rapid,classical`;
  return fetch(url, { headers: { Accept: "application/x-ndjson" } });
}

export async function fetchLichessGames(username: string): Promise<GameListItem[]> {
  let res = await fetchLichessGamesOnce(username);
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 2000));
    res = await fetchLichessGamesOnce(username);
  }

  if (res.status === 404 || res.status === 400) {
    throw new Error(`Player "${username}" not found on Lichess`);
  }
  if (!res.ok) {
    throw new Error("lichess_fetch_failed");
  }

  const text = await res.text();
  const lines = text.trim().split("\n").filter(Boolean);
  const games: LichessGame[] = lines.map(l => JSON.parse(l));

  return games
    .filter(g => g.pgn)
    .map((g, idx) => {
      const wName = g.players.white.user?.name ?? "?";
      const bName = g.players.black.user?.name ?? "?";
      const wRating = g.players.white.rating ?? 0;
      const bRating = g.players.black.rating ?? 0;
      const isWhite = wName.toLowerCase() === username.toLowerCase();

      let whiteResult = "unknown";
      let blackResult = "unknown";
      if (g.winner === "white") { whiteResult = "win"; blackResult = "checkmated"; }
      else if (g.winner === "black") { blackResult = "win"; whiteResult = "checkmated"; }
      else if (!g.winner && g.status !== "aborted") { whiteResult = "draw"; blackResult = "draw"; }

      return {
        id: `${g.id}_${idx}`,
        pgn: g.pgn ?? "",
        white: wName,
        black: bName,
        whiteRating: wRating,
        blackRating: bRating,
        whiteResult,
        blackResult,
        timeClass: g.speed,
        endTime: Math.floor(g.lastMoveAt / 1000),
      } satisfies GameListItem;
    });
}

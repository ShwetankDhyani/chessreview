import { fetchMonthGames } from "./chesscomApi";

const USER_AGENT = "ChessReviewApp/1.0";

export type GameUrlPlatform = "lichess" | "chesscom";

export interface ParsedGameUrl {
  platform: GameUrlPlatform;
  gameId: string;
  gameType?: "live" | "daily";
}

/** Detect Chess.com / Lichess game links (not profile URLs). */
export function parseGameUrl(input: string): ParsedGameUrl | null {
  const raw = input.trim();
  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "lichess.org") {
    const m = url.pathname.match(
      /^(?:\/embed)?\/(?:game\/)?([a-zA-Z0-9]{8})(?:\/.*)?$/
    );
    if (m) return { platform: "lichess", gameId: m[1] };
    return null;
  }

  if (host === "chess.com") {
    const m = url.pathname.match(
      /\/game\/(live|daily)\/(\d+)/i
    );
    if (m) {
      return {
        platform: "chesscom",
        gameId: m[2],
        gameType: m[1].toLowerCase() as "live" | "daily",
      };
    }
    const analysis = url.pathname.match(
      /\/analysis\/game\/(live|daily)\/(\d+)/i
    );
    if (analysis) {
      return {
        platform: "chesscom",
        gameId: analysis[2],
        gameType: analysis[1].toLowerCase() as "live" | "daily",
      };
    }
  }

  return null;
}

async function fetchLichessPgn(gameId: string): Promise<string> {
  const res = await fetch(
    `https://lichess.org/api/games/export/${encodeURIComponent(gameId)}?pgnInJson=true&clocks=false&evals=false`,
    { headers: { Accept: "application/x-ndjson" } }
  );
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? "Lichess game not found — check the link is a finished game."
        : `Lichess export failed (${res.status})`
    );
  }
  const text = (await res.text()).trim();
  if (!text) throw new Error("Lichess returned an empty game.");

  if (text.startsWith("{")) {
    const row = JSON.parse(text.split("\n")[0]) as { pgn?: string };
    if (row.pgn?.trim()) return row.pgn.trim();
  }
  if (text.includes("[Event")) return text;

  throw new Error("Could not read PGN from Lichess.");
}

interface ChessComCallbackGame {
  id?: number;
  endTime?: number;
  pgnHeaders?: {
    White?: string;
    Black?: string;
    Date?: string;
  };
}

async function fetchChessComMeta(
  gameId: string,
  gameType: "live" | "daily"
): Promise<ChessComCallbackGame> {
  const path = gameType === "daily" ? "daily" : "live";
  const res = await fetch(
    `https://www.chess.com/callback/${path}/game/${gameId}`,
    { headers: { "User-Agent": USER_AGENT } }
  );
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? "Chess.com game not found."
        : `Chess.com lookup failed (${res.status})`
    );
  }
  const data = (await res.json()) as { game?: ChessComCallbackGame };
  if (!data.game?.pgnHeaders?.White || !data.game.pgnHeaders.Black) {
    throw new Error("Chess.com did not return player names for this game.");
  }
  return data.game;
}

async function findChessComPgn(
  white: string,
  black: string,
  endTime: number
): Promise<string> {
  const d = new Date(endTime * 1000);
  const months: Array<{ y: number; m: number }> = [
    { y: d.getFullYear(), m: d.getMonth() + 1 },
    {
      y: d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear(),
      m: d.getMonth() === 0 ? 12 : d.getMonth(),
    },
  ];

  for (const { y, m } of months) {
    for (const player of [white, black]) {
      const games = await fetchMonthGames(player, y, m).catch(() => []);
      const hit = games.find(
        (g) =>
          g.white.toLowerCase() === white.toLowerCase() &&
          g.black.toLowerCase() === black.toLowerCase() &&
          Math.abs(g.endTime - endTime) <= 180
      );
      if (hit?.pgn) return hit.pgn;
    }
  }

  throw new Error(
    "Game found on Chess.com but PGN is not in the public archive yet. Copy PGN from Share → Download PGN and paste below."
  );
}

async function fetchChessComPgn(
  gameId: string,
  gameType: "live" | "daily"
): Promise<string> {
  const meta = await fetchChessComMeta(gameId, gameType);
  if (!meta.endTime || !meta.pgnHeaders?.White || !meta.pgnHeaders.Black) {
    throw new Error("Incomplete Chess.com game metadata.");
  }
  return findChessComPgn(
    meta.pgnHeaders.White,
    meta.pgnHeaders.Black,
    meta.endTime
  );
}

export async function fetchPgnFromGameUrl(
  input: string
): Promise<{ pgn: string; label: string }> {
  const parsed = parseGameUrl(input);
  if (!parsed) {
    throw new Error(
      "Paste a Chess.com or Lichess game link (e.g. chess.com/game/live/… or lichess.org/abcdefgh)."
    );
  }

  if (parsed.platform === "lichess") {
    const pgn = await fetchLichessPgn(parsed.gameId);
    return { pgn, label: `Lichess ${parsed.gameId}` };
  }

  const pgn = await fetchChessComPgn(
    parsed.gameId,
    parsed.gameType ?? "live"
  );
  return { pgn, label: `Chess.com #${parsed.gameId}` };
}

/**
 * Import PGN from Chess.com / Lichess game URLs via same-origin API (avoids CORS).
 */

export type GameUrlPlatform = "lichess" | "chesscom";

export interface ParsedGameUrl {
  platform: GameUrlPlatform;
  gameId: string;
  gameType?: "live" | "daily";
}

/** Client-side URL validation (mirrors server/gameUrlImport.mjs). */
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

export async function fetchPgnFromGameUrl(
  input: string
): Promise<{ pgn: string; label: string }> {
  const parsed = parseGameUrl(input);
  if (!parsed) {
    throw new Error(
      "Paste a Chess.com or Lichess game link (e.g. chess.com/game/live/… or lichess.org/abcdefgh)."
    );
  }

  const res = await fetch("/api/game-import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: input.trim() }),
  });

  let data: { pgn?: string; label?: string; error?: string };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    throw new Error(
      res.ok
        ? "Invalid response from import service."
        : `Import failed (${res.status}). Try pasting PGN instead.`
    );
  }

  if (!res.ok || !data.pgn) {
    throw new Error(data.error ?? `Import failed (${res.status})`);
  }

  return {
    pgn: data.pgn,
    label: data.label ?? `${parsed.platform} game`,
  };
}

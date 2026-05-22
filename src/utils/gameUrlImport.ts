/**
 * Import PGN from Chess.com / Lichess game URLs via same-origin API (avoids CORS).
 */

import {
  getUrlHost,
  isSupportedGameHost,
  INVALID_GAME_URL_MSG,
  UNSUPPORTED_URL_MSG,
} from "./gameUrlHosts";

export type GameUrlPlatform = "lichess" | "chesscom";

export interface ParsedGameUrl {
  platform: GameUrlPlatform;
  gameId: string;
  gameType?: "live" | "daily";
}

function parseLichessGameId(pathname: string): string | null {
  const patterns = [
    /^\/(?:embed\/)?(?:game\/)?([a-zA-Z0-9]{8})(?:\/|$)/,
    /\/(?:embed\/)?game\/([a-zA-Z0-9]{8})(?:\/|$)/i,
    /^\/([a-zA-Z0-9]{8})(?:\/(?:white|black|black#?\d*))?\/?$/i,
    /\/broadcast\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/([a-zA-Z0-9]{8})\/?$/i,
  ];
  for (const re of patterns) {
    const m = pathname.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

/** Client-side URL validation (mirrors server/gameUrlImport.mjs). */
export function parseGameUrl(input: string): ParsedGameUrl | null {
  const host = getUrlHost(input);
  if (!host || !isSupportedGameHost(host)) return null;

  let url: URL;
  try {
    url = new URL(
      input.trim().includes("://") ? input.trim() : `https://${input.trim()}`
    );
  } catch {
    return null;
  }

  if (host === "lichess.org") {
    const id = parseLichessGameId(url.pathname);
    if (id) return { platform: "lichess", gameId: id };
    return null;
  }

  const m = url.pathname.match(/\/game\/(live|daily)\/(\d+)/i);
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

  return null;
}

export async function fetchPgnFromGameUrl(
  input: string
): Promise<{ pgn: string; label: string }> {
  const trimmed = input.trim();
  const host = getUrlHost(trimmed);

  if (!host) {
    throw new Error(INVALID_GAME_URL_MSG);
  }
  if (!isSupportedGameHost(host)) {
    throw new Error(UNSUPPORTED_URL_MSG);
  }
  if (!parseGameUrl(trimmed)) {
    throw new Error(INVALID_GAME_URL_MSG);
  }

  const res = await fetch("/api/game-import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: trimmed }),
  });

  let data: { pgn?: string; label?: string; error?: string };
  const raw = await res.text();
  try {
    data = JSON.parse(raw) as typeof data;
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
    label: data.label ?? "Imported game",
  };
}

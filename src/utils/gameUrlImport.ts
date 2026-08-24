/**
 * Import PGN from Chess.com / Lichess game URLs via same-origin API (avoids CORS).
 */

import {
  getUrlHost,
  isSupportedGameHost,
  INVALID_GAME_URL_MSG,
  UNSUPPORTED_URL_MSG,
} from "./gameUrlHosts";
import { fetchWithTimeout } from "./netRetry";

export type GameUrlPlatform = "lichess" | "chesscom";

export interface ParsedGameUrl {
  platform: GameUrlPlatform;
  gameId: string;
  gameType?: "live" | "daily";
}

/** Lichess ids are 8 chars; share links may add a suffix (e.g. /dOgzWsouXS6w). */
function normalizeLichessId(slug: string): string | null {
  if (slug.length === 8) return slug;
  if (slug.length > 8) return slug.slice(0, 8);
  return null;
}

function parseLichessGameId(pathname: string): string | null {
  const broadcast = pathname.match(
    /\/broadcast\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/([a-zA-Z0-9]{8})\/?$/i
  );
  if (broadcast?.[1]) return broadcast[1];

  const gamePath = pathname.match(
    /^\/(?:embed\/)?game\/([a-zA-Z0-9]{8,})(?:\/|$)/i
  );
  if (gamePath?.[1]) return normalizeLichessId(gamePath[1]);

  const root = pathname.match(/^\/([a-zA-Z0-9]{8,})(?:\/|$)/);
  if (root?.[1]) return normalizeLichessId(root[1]);

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

  const res = await fetchWithTimeout("/api/game-import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: trimmed }),
  }, 25_000);

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

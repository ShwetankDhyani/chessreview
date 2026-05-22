export const UNSUPPORTED_URL_MSG =
  "Only chess.com and lichess.org game links are supported.";

export const INVALID_GAME_URL_MSG =
  "Could not read that game link. Use a finished chess.com or lichess.org game URL.";

export function getUrlHost(input: string): string | null {
  try {
    const url = new URL(
      input.trim().includes("://") ? input.trim() : `https://${input.trim()}`
    );
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function isSupportedGameHost(host: string | null): boolean {
  return host === "chess.com" || host === "lichess.org";
}

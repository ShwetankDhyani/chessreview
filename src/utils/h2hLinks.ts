/** Build an H2H deep-link for a username + platform. */
export function h2hLookupPath(
  username: string,
  platform: "chesscom" | "lichess" = "chesscom"
): string {
  const u = username.trim();
  const params = new URLSearchParams();
  if (u) params.set("u", u);
  params.set("p", platform === "lichess" ? "lichess" : "chesscom");
  const q = params.toString();
  return q ? `/h2h?${q}` : "/h2h";
}

const LOOKS_LIKE_BOT =
  /^(stockfish|komodo|leela|engine|computer|ai|bot|guest|anonymous|player)$/i;

/**
 * Prefer the opponent seat relative to the active profile; otherwise the
 * non-generic name. Returns null when neither name is useful for a lookup.
 */
export function pickH2hOpponent(opts: {
  whiteName?: string;
  blackName?: string;
  activeUsername?: string | null;
}): string | null {
  const white = (opts.whiteName ?? "").trim();
  const black = (opts.blackName ?? "").trim();
  const self = (opts.activeUsername ?? "").trim().toLowerCase();

  const isUseful = (name: string) => {
    if (!name) return false;
    if (/^(white|black)$/i.test(name)) return false;
    if (LOOKS_LIKE_BOT.test(name)) return false;
    if (name.length < 2 || name.length > 32) return false;
    return /^[\w\-]+$/.test(name);
  };

  if (self) {
    if (white.toLowerCase() === self && isUseful(black)) return black;
    if (black.toLowerCase() === self && isUseful(white)) return white;
  }
  if (isUseful(white) && !isUseful(black)) return white;
  if (isUseful(black) && !isUseful(white)) return black;
  if (isUseful(white) && isUseful(black)) {
    // Prefer black as the "opponent" when reviewing as White is more common;
    // callers with an active profile already resolved above.
    return black;
  }
  return null;
}

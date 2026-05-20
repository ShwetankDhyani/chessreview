import { Chess } from "chess.js";

export type PgnParseResult =
  | { ok: true; pgn: string; moveCount: number }
  | { ok: false; error: string };

/** Validate and normalize pasted or imported game text (PGN only). */
export function parseGameText(raw: string): PgnParseResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Paste a PGN or choose a .pgn file first." };
  }

  if (/^\[FEN\s/m.test(trimmed) && !/\d+\./.test(trimmed)) {
    return {
      ok: false,
      error:
        "That looks like a single position (FEN), not a full game. Paste a complete PGN with moves.",
    };
  }

  try {
    const chess = new Chess();
    chess.loadPgn(trimmed);
    const moves = chess.history();
    if (moves.length === 0) {
      return {
        ok: false,
        error: "No moves found. Export PGN from Chess.com, Lichess, or your app.",
      };
    }
    return { ok: true, pgn: trimmed, moveCount: moves.length };
  } catch {
    return {
      ok: false,
      error:
        "Could not read this as PGN. Use standard PGN text (not PNG images or move lists only).",
    };
  }
}

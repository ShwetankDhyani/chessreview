import { Chess } from "chess.js";

export type PgnParseResult =
  | { ok: true; pgn: string; moveCount: number }
  | { ok: false; error: string };

/** Validate and normalize pasted or imported game text (PGN only). */
export function parseGameText(raw: string): PgnParseResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Empty" };
  }

  if (/^\[FEN\s/m.test(trimmed) && !/\d+\./.test(trimmed)) {
    return { ok: false, error: "Not a full game PGN" };
  }

  try {
    const chess = new Chess();
    chess.loadPgn(trimmed);
    const moves = chess.history();
    if (moves.length === 0) {
      return { ok: false, error: "No moves in PGN" };
    }
    return { ok: true, pgn: trimmed, moveCount: moves.length };
  } catch {
    return { ok: false, error: "Invalid PGN" };
  }
}

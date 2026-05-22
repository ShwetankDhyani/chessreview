import { Chess } from "chess.js";

/** Half-move count (plies) in a PGN — stable before engine analysis finishes. */
export function countPgnPlies(pgn: string): number {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    return chess.history().length;
  } catch {
    return 0;
  }
}

/**
 * Chess full-move number (1 = 1. … and 1…, 2 = 2. … and 2…, etc.)
 * from a 0-based ply index (-1 = starting position).
 */
export function plyIndexToFullMoveNumber(plyIndex: number): number | null {
  if (plyIndex < 0) return null;
  return Math.floor(plyIndex / 2) + 1;
}

/** Total full moves in a game from its half-move (ply) count. */
export function totalFullMovesFromPlyCount(plyCount: number): number {
  if (plyCount <= 0) return 0;
  return Math.ceil(plyCount / 2);
}

/** Label for mobile/desktop move counter (chess moves, not plies). */
export function formatChessMoveCounter(
  plyIndex: number,
  plyCount: number
): string {
  const total = totalFullMovesFromPlyCount(plyCount);
  if (plyCount <= 0) return "—";
  const current = plyIndexToFullMoveNumber(plyIndex);
  if (current === null) return `Start / ${total}`;
  return `${current} / ${total}`;
}

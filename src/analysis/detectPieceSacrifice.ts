import { Chess } from "chess.js";

const PIECE_VALUE: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

function materialCount(chess: Chess, color: "w" | "b"): number {
  let total = 0;
  for (const row of chess.board()) {
    for (const p of row) {
      if (p && p.color === color) total += PIECE_VALUE[p.type] ?? 0;
    }
  }
  return total;
}

/**
 * Stub for brilliant detection — extend with engine-line tactical validation.
 * Returns true when mover's material drops without immediate forced recapture compensation.
 */
export function detectPieceSacrifice(
  fenBefore: string,
  fenAfter: string,
  engineLine?: string[]
): boolean {
  void engineLine;
  try {
    const before = new Chess(fenBefore);
    const after = new Chess(fenAfter);
    const mover = before.turn();
    const matBefore = materialCount(before, mover);
    const matAfter = materialCount(after, mover);
    return matAfter <= matBefore - 2;
  } catch {
    return false;
  }
}

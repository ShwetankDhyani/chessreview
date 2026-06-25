import { Chess } from "chess.js";

const PIECE_VALUE: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

const SF_MATERIAL_DEFAULT = 78;

/** Total material on board (both sides, standard piece values). */
export function totalBoardMaterial(fen: string): number {
  try {
    const chess = new Chess(fen);
    let total = 0;
    for (const row of chess.board()) {
      for (const p of row) {
        if (p) total += PIECE_VALUE[p.type] ?? 0;
      }
    }
    return total;
  } catch {
    return SF_MATERIAL_DEFAULT;
  }
}

export function materialForSide(fen: string, color: "w" | "b"): number {
  try {
    const chess = new Chess(fen);
    let total = 0;
    for (const row of chess.board()) {
      for (const p of row) {
        if (p && p.color === color) total += PIECE_VALUE[p.type] ?? 0;
      }
    }
    return total;
  } catch {
    return 39;
  }
}

/**
 * Material delta for mover on this ply (negative = sacrifice).
 * Compares mover's piece values before vs after the move.
 */
export function computeMaterialDelta(fenBefore: string, fenAfter: string): number {
  try {
    const before = new Chess(fenBefore);
    const after = new Chess(fenAfter);
    const mover = before.turn();
    const matBefore = materialForSide(fenBefore, mover);
    const matAfter = materialForSide(fenAfter, mover);
    return matAfter - matBefore;
  } catch {
    return 0;
  }
}

export { PIECE_VALUE };

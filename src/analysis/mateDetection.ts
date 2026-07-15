import { Chess } from "chess.js";

/** True when side to move in `fen` is checkmated (previous ply delivered mate). */
export function isCheckmatePosition(fen: string): boolean {
  try {
    return new Chess(fen).isCheckmate();
  } catch {
    return false;
  }
}

/** Mover just played; `fenAfter` is opponent to move and is mated. */
export function isDeliveredCheckmate(fenAfter: string): boolean {
  return isCheckmatePosition(fenAfter);
}

/**
 * After the mover's ply, the opponent has a mate-in-1.
 * (You hung mate — whatever the engine ranking says.)
 */
export function walksIntoMateInOne(fenAfter: string): boolean {
  try {
    const chess = new Chess(fenAfter);
    if (chess.isGameOver()) return false;
    for (const move of chess.moves({ verbose: true })) {
      const next = new Chess(fenAfter);
      next.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      });
      if (next.isCheckmate()) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** True when every legal move from fenBefore allows a mate-in-1 reply. */
export function everyMoveWalksIntoMateInOne(fenBefore: string): boolean {
  try {
    const chess = new Chess(fenBefore);
    const legal = chess.moves({ verbose: true });
    if (!legal.length) return false;
    for (const move of legal) {
      const after = new Chess(fenBefore);
      after.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      });
      if (!walksIntoMateInOne(after.fen())) return false;
    }
    return true;
  } catch {
    return false;
  }
}

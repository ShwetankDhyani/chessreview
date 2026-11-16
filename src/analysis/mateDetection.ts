import { Chess } from "chess.js";

export interface TerminalPositionEval {
  isTerminal: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  /** From White's perspective */
  mate?: number;
  cp?: number;
  wdl?: { w: number; d: number; l: number };
}

/**
 * Detects whether `fen` is already terminal (checkmate or stalemate / draw with 0 legal moves).
 * Stockfish UCI engines cannot search positions with 0 legal moves and will never emit
 * a `bestmove` line, leading to worker deadlocks or timeouts.
 */
export function detectTerminalPosition(fen: string): TerminalPositionEval {
  try {
    const chess = new Chess(fen);
    if (!chess.isGameOver()) {
      return { isTerminal: false, isCheckmate: false, isStalemate: false };
    }
    const isCheckmate = chess.isCheckmate();
    const isBlackToMove = fen.split(" ")[1] === "b";

    if (isCheckmate) {
      return {
        isTerminal: true,
        isCheckmate: true,
        isStalemate: false,
        mate: isBlackToMove ? 1 : -1,
        wdl: isBlackToMove ? { w: 1000, d: 0, l: 0 } : { w: 0, d: 0, l: 1000 },
      };
    }

    return {
      isTerminal: true,
      isCheckmate: false,
      isStalemate: true,
      cp: 0,
      wdl: { w: 0, d: 1000, l: 0 },
    };
  } catch {
    return { isTerminal: false, isCheckmate: false, isStalemate: false };
  }
}

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

import { Chess } from "chess.js";
import type { AnalyzedMove } from "../types";

export const BOARD_START_FEN = "start";

const INITIAL_FEN = new Chess().fen();

/** Normalize react-chessboard `"start"` and full FEN for comparisons. */
export function normalizeFen(fen: string): string {
  return fen === BOARD_START_FEN ? INITIAL_FEN : fen;
}

export function sameFen(a: string, b: string): boolean {
  return normalizeFen(a) === normalizeFen(b);
}

/** FEN on the board immediately before playing move at `idx`. */
export function positionBeforeMove(
  moves: AnalyzedMove[],
  idx: number
): string {
  if (idx <= 0) {
    return moves[0]?.fenBefore ?? BOARD_START_FEN;
  }
  return moves[idx - 1].fenAfter;
}

/** True when `current` is the board state one ply before move `idx`. */
export function isAtPositionBeforeMove(
  current: string,
  moves: AnalyzedMove[],
  idx: number
): boolean {
  const prior = positionBeforeMove(moves, idx);
  if (sameFen(current, prior)) return true;
  const m = moves[idx];
  if (m && sameFen(current, m.fenBefore)) return true;
  if (idx === 0 && current === BOARD_START_FEN) return true;
  return false;
}

/**
 * Whether playing the move described by `highlight` (from→to squares) on the
 * board currently showing `prevFen` would yield exactly `targetFen`. If true,
 * react-chessboard's piece-tracking algorithm can safely animate a single
 * piece. Anything else (multi-ply jump, mismatched highlight, capture+move
 * combo with stale board) returns false → caller should snap+remount.
 */
export function canAnimateOneStep(
  prevFen: string,
  targetFen: string,
  highlight: { from: string; to: string }
): boolean {
  if (sameFen(prevFen, targetFen)) return false;
  try {
    const c = new Chess(normalizeFen(prevFen));
    const result = c.move({
      from: highlight.from,
      to: highlight.to,
      promotion: "q",
    });
    if (!result) return false;
    return sameFen(c.fen(), targetFen);
  } catch {
    return false;
  }
}

/** True when `highlight` is the single ply between `targetFen` and `prevFen` (undo). */
export function canAnimateUndoStep(
  prevFen: string,
  targetFen: string,
  highlight: { from: string; to: string }
): boolean {
  return canAnimateOneStep(targetFen, prevFen, highlight);
}

export function canAnimateBoardStep(
  renderedFen: string,
  targetFen: string,
  highlight: { from: string; to: string } | null
): boolean {
  if (!highlight) return false;
  return (
    canAnimateOneStep(renderedFen, targetFen, highlight) ||
    canAnimateUndoStep(renderedFen, targetFen, highlight)
  );
}

export function highlightFromUci(
  uci: string | undefined
): { from: string; to: string } | null {
  if (!uci || uci.length < 4) return null;
  return { from: uci.slice(0, 2), to: uci.slice(2, 4) };
}

/** FEN + last-move highlight for a one-ply board step (forward or back). */
export function resolveBoardNavStep(
  moves: AnalyzedMove[],
  fromIdx: number,
  toIdx: number
): {
  fen: string;
  highlight: { from: string; to: string } | null;
} {
  if (toIdx < 0) {
    return {
      fen: BOARD_START_FEN,
      highlight: fromIdx === 0 ? highlightFromUci(moves[0]?.uci) : null,
    };
  }
  const target = moves[toIdx];
  const targetHighlight = highlightFromUci(target.uci);
  if (fromIdx === toIdx + 1 && fromIdx < moves.length) {
    return {
      fen: target.fenAfter,
      highlight: highlightFromUci(moves[fromIdx].uci),
    };
  }
  return { fen: target.fenAfter, highlight: targetHighlight };
}

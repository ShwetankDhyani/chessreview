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

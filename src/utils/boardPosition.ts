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

/**
 * Board + side + castling + ep — ignores halfmove/fullmove clocks that often
 * drift between analysis FENs and a live chess.js replay.
 */
export function fenPositionKey(fen: string): string {
  const parts = normalizeFen(fen).split(/\s+/);
  return parts.slice(0, 4).join(" ");
}

export function samePosition(a: string, b: string): boolean {
  return fenPositionKey(a) === fenPositionKey(b);
}

const PROMOTIONS = ["q", "n", "r", "b"] as const;

/**
 * Play `from→to` on `fen`, trying each promotion piece. Returns the verbose
 * move when the resulting position matches `targetFen` (clocks ignored).
 */
export function matchHighlightMove(
  fen: string,
  targetFen: string,
  highlight: { from: string; to: string }
): ReturnType<Chess["move"]> | null {
  const { from, to } = highlight;
  for (const promotion of PROMOTIONS) {
    try {
      const trial = new Chess(normalizeFen(fen));
      const result = trial.move({ from, to, promotion });
      if (result && samePosition(trial.fen(), targetFen)) return result;
    } catch {
      /* try next */
    }
  }
  try {
    const trial = new Chess(normalizeFen(fen));
    const result = trial.move({ from, to });
    if (result && samePosition(trial.fen(), targetFen)) return result;
  } catch {
    return null;
  }
  return null;
}

/**
 * Find any single legal move on `prevFen` that yields `targetFen`.
 * Used when highlight is missing or underpromotion/UCI is stale.
 */
export function findOnePlyMove(
  prevFen: string,
  targetFen: string
): ReturnType<Chess["move"]> | null {
  if (samePosition(prevFen, targetFen)) return null;
  try {
    const base = new Chess(normalizeFen(prevFen));
    const targetKey = fenPositionKey(targetFen);
    for (const verbose of base.moves({ verbose: true })) {
      const trial = new Chess(normalizeFen(prevFen));
      const result = trial.move(verbose);
      if (result && fenPositionKey(trial.fen()) === targetKey) return result;
    }
  } catch {
    return null;
  }
  return null;
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
  if (samePosition(prevFen, targetFen)) return false;
  return matchHighlightMove(prevFen, targetFen, highlight) != null;
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
  if (highlight) {
    return (
      canAnimateOneStep(renderedFen, targetFen, highlight) ||
      canAnimateUndoStep(renderedFen, targetFen, highlight)
    );
  }
  // No highlight — still animate if the FEN pair is exactly one legal ply apart.
  return (
    findOnePlyMove(renderedFen, targetFen) != null ||
    findOnePlyMove(targetFen, renderedFen) != null
  );
}

export function highlightFromUci(
  uci: string | undefined
): { from: string; to: string } | null {
  if (!uci || uci.length < 4) return null;
  const from = uci.slice(0, 2).toLowerCase();
  const to = uci.slice(2, 4).toLowerCase();
  if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) return null;
  return { from, to };
}

/** Prefer UCI; fall back to replaying SAN on fenBefore when UCI is missing. */
export function highlightFromMove(move: {
  uci?: string;
  san?: string;
  fenBefore?: string;
}): { from: string; to: string } | null {
  const fromUci = highlightFromUci(move.uci);
  if (fromUci) return fromUci;
  if (!move.fenBefore || !move.san) return null;
  try {
    const c = new Chess(normalizeFen(move.fenBefore));
    const result = c.move(move.san);
    if (!result?.from || !result?.to) return null;
    return { from: result.from, to: result.to };
  } catch {
    return null;
  }
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

/**
 * Resolves the square highlight for the board.
 * In normal game review, highlights the current game move.
 * In continuation exploration (better line):
 * - If user stepped into a continuation move, highlights that continuation move's from/to squares.
 * - If at step 0 (back at branch), highlights the move that led to the branch position.
 */
export function resolveBoardLastMoveHighlight(opts: {
  continuationFen?: string | null;
  continuationHighlight?: { from: string; to: string } | null;
  currentMoveIdx: number;
  moves: Array<{ uci?: string; san?: string; fenBefore?: string }>;
  moveAnim?: { from: string; to: string } | null;
}): { from: string; to: string } | null {
  if (opts.continuationFen) {
    if (opts.continuationHighlight) {
      return opts.continuationHighlight;
    }
    if (opts.currentMoveIdx > 0) {
      return highlightFromMove(opts.moves[opts.currentMoveIdx - 1] ?? {});
    }
    return null;
  }
  if (opts.currentMoveIdx >= 0) {
    return (
      highlightFromMove(opts.moves[opts.currentMoveIdx] ?? {}) ??
      opts.moveAnim ??
      null
    );
  }
  return opts.moveAnim ?? null;
}


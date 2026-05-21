/**
 * Move classification (Chess.com-style bands + brilliant/great heuristics).
 * Pure logic — unit-tested in moveClassification.test.ts.
 */

import { Chess, type Move as ChessMove, type Color, type Square } from "chess.js";
import type { MoveClassification } from "../types";

/** Expected-points loss bands (Lichess / Chess.com CAPS-style) */
export const EP_THRESHOLDS = {
  best: 0.008,
  excellent: 0.02,
  good: 0.05,
  inaccuracy: 0.1,
  mistake: 0.2,
  book: 0.005,
  brilliantMaxEp: 0.02,
} as const;

export const BOOK_MAX_PLY = 16;
export const MIN_EVAL_DEPTH = 10;

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export function pieceValue(type: string): number {
  return PIECE_VALUES[type] ?? 0;
}

export function materialCount(chess: Chess, color: Color): number {
  let total = 0;
  for (const row of chess.board()) {
    for (const p of row) {
      if (p && p.color === color) total += PIECE_VALUES[p.type] ?? 0;
    }
  }
  return total;
}

function opposite(color: Color): Color {
  return color === "w" ? "b" : "w";
}

/** Attackers of `square` for `side` (pieces that can legally move to square). */
function attackersOf(chess: Chess, square: Square, side: Color): ChessMove[] {
  const moves = chess.moves({ verbose: true });
  return moves.filter((m) => m.color === side && m.to === square);
}

/**
 * Static exchange evaluation on `square` with `side` to move first.
 * Positive = side to move wins material on that square.
 */
export function staticExchangeEval(chess: Chess, square: Square, side: Color): number {
  const attackers = attackersOf(chess, square, side);
  if (attackers.length === 0) return 0;

  const move = attackers.reduce((a, b) =>
    pieceValue(a.piece) <= pieceValue(b.piece) ? a : b
  );

  const target = chess.get(square);
  const capturedVal = target ? pieceValue(target.type) : 0;

  const next = new Chess(chess.fen());
  try {
    next.move({ from: move.from, to: move.to, promotion: move.promotion });
  } catch {
    return 0;
  }

  return capturedVal - staticExchangeEval(next, square, opposite(side));
}

/** Net material for mover after move, resolved with SEE on destination (pessimistic). */
export function exchangeBalanceAfterMove(
  fenBefore: string,
  uci: string,
  color: Color
): number | null {
  const from = uci.slice(0, 2) as Square;
  const to = uci.slice(2, 4) as Square;
  const promotion = uci[4] as "q" | "r" | "b" | "n" | undefined;

  try {
    const before = new Chess(fenBefore);
    if (before.turn() !== color) return null;
    const matBefore = materialCount(before, color);

    const after = new Chess(fenBefore);
    const played = after.move({ from, to, promotion });
    if (!played) return null;

    const seeLoss = -staticExchangeEval(after, to, opposite(color));
    const matAfter = materialCount(after, color);
    const rawDelta = matAfter - matBefore;

    return Math.min(rawDelta, seeLoss);
  } catch {
    return null;
  }
}

export function isRecaptureOnSquare(
  history: ChessMove[],
  moveIndex: number,
  to: string,
  from: string
): boolean {
  if (moveIndex > 0) {
    const prev = history[moveIndex - 1];
    if (prev.captured && (prev.to === to || prev.to === from)) return true;
  }
  if (moveIndex > 1) {
    const prev2 = history[moveIndex - 2];
    if (prev2.captured && (prev2.to === to || prev2.to === from)) return true;
  }
  return false;
}

export function isForcedTradeWhileInCheck(
  fenBefore: string,
  uci: string,
  color: Color,
  exchangeBalance: number
): boolean {
  const chess = new Chess(fenBefore);
  if (!chess.inCheck() || chess.turn() !== color) return false;
  return exchangeBalance >= -3;
}

/**
 * Voluntary material give-up (for brilliant). False for equal trades, recaptures,
 * profitable captures, and forced defensive exchanges.
 */
export function detectVoluntarySacrifice(
  fenBefore: string,
  uci: string,
  color: Color,
  history: ChessMove[],
  moveIndex: number
): boolean {
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);

  if (isRecaptureOnSquare(history, moveIndex, to, from)) return false;

  const chess = new Chess(fenBefore);
  if (chess.turn() !== color) return false;

  const piece = chess.get(from as Square);
  if (!piece || piece.type === "p" || piece.type === "k") return false;

  const movingVal = pieceValue(piece.type);
  const capturedBefore = chess.get(to as Square);
  if (capturedBefore && pieceValue(capturedBefore.type) >= movingVal) return false;

  const balance = exchangeBalanceAfterMove(fenBefore, uci, color);
  if (balance === null) return false;

  if (balance >= -1) return false;

  if (isForcedTradeWhileInCheck(fenBefore, uci, color, balance)) return false;

  try {
    const tmp = new Chess(fenBefore);
    const result = tmp.move({
      from: from as Square,
      to: to as Square,
      promotion: uci[4] as "q" | "r" | "b" | "n" | undefined,
    });
    if (!result) return false;
    if (!result.captured) {
      const hung = tmp
        .moves({ verbose: true })
        .some((m) => m.to === to && m.captured);
      if (!hung) return false;
      return balance <= -3;
    }
  } catch {
    return false;
  }

  return balance <= -2;
}

/** Stricter bar for !! brilliant (real piece sacrifice, not a pawn-for-check trade). */
export function qualifiesForBrilliant(
  fenBefore: string,
  uci: string,
  color: Color,
  history: ChessMove[],
  moveIndex: number,
  exchangeBalance: number | null
): boolean {
  if (!detectVoluntarySacrifice(fenBefore, uci, color, history, moveIndex)) {
    return false;
  }
  const bal =
    exchangeBalance ??
    exchangeBalanceAfterMove(fenBefore, uci, color);
  return bal !== null && bal <= -3;
}

export function isEngineTopMove(epLoss: number, playerUci: string, bestUci?: string): boolean {
  if (epLoss <= EP_THRESHOLDS.best) return true;
  if (!bestUci) return false;
  return playerUci.toLowerCase() === bestUci.toLowerCase();
}

export function couldBeBookMove(
  plyIndex: number,
  bookEnded: boolean,
  epLoss: number,
  cpBeforeAbs: number,
  isTop: boolean
): boolean {
  if (bookEnded || plyIndex >= BOOK_MAX_PLY) return false;
  if (epLoss > EP_THRESHOLDS.book) return false;
  if (!isTop && epLoss > EP_THRESHOLDS.book / 2) return false;
  if (cpBeforeAbs > 180) return false;
  return true;
}

export interface ClassifyMoveInput {
  epLoss: number;
  isBook: boolean;
  qualifiesBrilliant: boolean;
  wpBeforePct: number;
  wpAfterActualPct: number;
  isTop: boolean;
  prevWpForMoverPct: number;
  hasMateScore: boolean;
}

export function classifyMove(input: ClassifyMoveInput): MoveClassification {
  const {
    epLoss,
    isBook,
    qualifiesBrilliant,
    wpBeforePct,
    wpAfterActualPct,
    isTop,
    prevWpForMoverPct,
    hasMateScore,
  } = input;

  if (isBook) return "book";

  const wpBefore = wpBeforePct / 100;
  const wpAfter = wpAfterActualPct / 100;

  if (
    qualifiesBrilliant &&
    isTop &&
    epLoss <= EP_THRESHOLDS.brilliantMaxEp &&
    !hasMateScore &&
    wpBefore > 0.15 &&
    wpBefore < 0.85 &&
    wpAfter >= 0.42 &&
    wpAfter <= wpBefore + 0.04 &&
    wpAfter >= wpBefore - 0.06
  ) {
    return "brilliant";
  }

  if (epLoss <= EP_THRESHOLDS.excellent) {
    const savedGame =
      isTop && wpBefore < 0.22 && wpAfter >= 0.42 && epLoss <= EP_THRESHOLDS.book;
    const capitalizesBlunder =
      isTop &&
      prevWpForMoverPct <= 42 &&
      wpBefore >= 0.68 &&
      wpAfter >= 0.62 &&
      epLoss <= EP_THRESHOLDS.book;
    if (savedGame || capitalizesBlunder) return "great";
  }

  if (isTop) return "best";
  if (epLoss <= EP_THRESHOLDS.best) return "best";
  if (epLoss <= EP_THRESHOLDS.excellent) return "excellent";
  if (epLoss <= EP_THRESHOLDS.good) return "good";
  if (epLoss <= EP_THRESHOLDS.inaccuracy) return "inaccuracy";
  if (epLoss <= EP_THRESHOLDS.mistake) return "mistake";
  return "blunder";
}

export function prevMoverWinPercent(
  fensList: string[],
  moveIndex: number,
  color: Color,
  chartCpWhite: Map<string, number>,
  clampCp: (v: number) => number,
  winPercent: (cp: number) => number
): number {
  if (moveIndex < 2) return 50;
  const sign = color === "w" ? 1 : -1;
  const fen = fensList[moveIndex - 2];
  const cpWhite = chartCpWhite.get(fen) ?? 0;
  return winPercent(clampCp(sign * cpWhite));
}

export function hasReliableEval(
  evalBefore: { depth: number; cp?: number; mate?: number } | undefined,
  evalAfter: { depth: number; cp?: number; mate?: number } | undefined,
  strictHasBefore: boolean,
  strictHasAfter: boolean,
  strictHasBest: boolean
): boolean {
  if (!strictHasBefore || !strictHasAfter || !strictHasBest) return false;
  if (!evalBefore || !evalAfter) return false;
  if (evalBefore.depth < MIN_EVAL_DEPTH || evalAfter.depth < MIN_EVAL_DEPTH) {
    return false;
  }
  return (
    evalBefore.depth > 0 &&
    evalAfter.depth > 0 &&
    (evalBefore.cp !== undefined ||
      evalBefore.mate !== undefined) &&
    (evalAfter.cp !== undefined || evalAfter.mate !== undefined)
  );
}

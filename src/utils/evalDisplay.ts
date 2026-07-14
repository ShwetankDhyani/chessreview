/**
 * Display helpers — engine eval uses centipawns; classification loss uses expected points (0–1).
 */

import type { EvalResult } from "../types";
import { expectedPointsFromEval, winPercentFromCp } from "../analysis/expectedPoints";
import { wdlTripleToWinProb } from "../analysis/wdl";
import { isDeliveredCheckmate } from "../analysis/mateDetection";

/** Expected-points loss (deltaE / epLoss) → whole-percent win chance lost. */
export function winChanceLossPercent(epLoss: number): number {
  return Math.round(Math.abs(epLoss) * 100);
}

/** e.g. "−18% win chance" for tooltips and coach copy. */
export function formatWinChanceLoss(epLoss: number): string | null {
  if (Math.abs(epLoss) < 0.01) return null;
  const pct = winChanceLossPercent(epLoss);
  if (pct < 1) return null;
  return `−${pct}% win chance`;
}

/** Compact form for inline UI: "−18%" */
export function formatWinChanceLossShort(epLoss: number): string {
  return `−${winChanceLossPercent(epLoss)}%`;
}

function evalHasScore(ev: EvalResult | null | undefined): boolean {
  if (!ev) return false;
  return (
    ev.mate !== undefined ||
    ev.wdl != null ||
    (typeof ev.cp === "number" && (ev.depth > 0 || ev.cp !== 0))
  );
}

/**
 * White win probability 0–100 for the eval bar.
 * Prefers mate → native WDL → logistic CP (aligned with review expected points).
 */
export function whiteWinPercentFromEval(
  evalResult: EvalResult | null | undefined
): number {
  if (!evalResult) return 50;
  if (evalResult.mate !== undefined) {
    return evalResult.mate > 0 ? 95 : 5;
  }
  if (evalResult.wdl) {
    const pct =
      wdlTripleToWinProb(evalResult.wdl.w, evalResult.wdl.d, evalResult.wdl.l) *
      100;
    return Math.min(95, Math.max(5, pct));
  }
  const pct = winPercentFromCp(evalResult.cp ?? 0);
  return Math.min(95, Math.max(5, pct));
}

/**
 * Signed mover win-chance change across a ply, in percentage points.
 * Prefers stored eBefore/eActual (review pipeline); falls back to evalBefore/evalAfter.
 */
export function moverWinChanceDeltaPercent(move: {
  color: "w" | "b";
  fenAfter?: string;
  eBefore?: number;
  eActual?: number;
  deltaE?: number;
  evalBefore?: EvalResult | null;
  evalAfter?: EvalResult | null;
}): number {
  const deliveredMate = move.fenAfter
    ? isDeliveredCheckmate(move.fenAfter)
    : false;

  if (
    typeof move.eBefore === "number" &&
    Number.isFinite(move.eBefore) &&
    typeof move.eActual === "number" &&
    Number.isFinite(move.eActual)
  ) {
    return (move.eActual - move.eBefore) * 100;
  }

  const hasBefore = evalHasScore(move.evalBefore);
  const hasAfter = deliveredMate || evalHasScore(move.evalAfter);

  if (hasBefore && hasAfter) {
    const before = expectedPointsFromEval(
      move.evalBefore ?? { cp: 0 },
      move.color
    );
    const after = expectedPointsFromEval(
      move.evalAfter ?? { cp: 0 },
      move.color,
      { afterDeliveredCheckmate: deliveredMate }
    );
    return (after - before) * 100;
  }

  // Legacy reviews: only non-negative EP loss was stored.
  if (typeof move.deltaE === "number" && Number.isFinite(move.deltaE)) {
    return -Math.abs(move.deltaE) * 100;
  }
  return 0;
}

/** Signed win-chance readout for fact sheets / tooltips: "+3%" / "−12%" / "0%". */
export function formatWinChanceDelta(deltaPercent: number): string {
  const pct = Math.round(deltaPercent);
  if (pct === 0) return "0%";
  return pct > 0 ? `+${pct}%` : `−${Math.abs(pct)}%`;
}

/** Longer tooltip form when non-zero. */
export function formatWinChanceDeltaLong(deltaPercent: number): string | null {
  const pct = Math.round(deltaPercent);
  if (pct === 0) return null;
  const body = pct > 0 ? `+${pct}%` : `−${Math.abs(pct)}%`;
  return `${body} win chance`;
}

/** Signed pawn eval from White's perspective (Lichess / Chess.com convention). */
export function formatSignedPawnsFromCp(cp: number): string {
  const pawns = cp / 100;
  if (Math.abs(pawns) < 0.05) return "0.0";
  return pawns > 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
}

/** Flip engine cp/mate (always stored white-relative) to the side at the bottom of the board. */
export function cpForBottomPlayer(cp: number, boardFlipped: boolean): number {
  return boardFlipped ? -cp : cp;
}

export function mateForBottomPlayer(mate: number, boardFlipped: boolean): number {
  return boardFlipped ? -mate : mate;
}

/** Eval label beside the board — from the perspective of whoever sits at the bottom. */
export function formatEvalForBoard(
  evalResult: { cp?: number; mate?: number } | null,
  boardFlipped: boolean
): { text: string; favorable: boolean } {
  if (!evalResult) return { text: "0.0", favorable: true };
  if (evalResult.mate !== undefined) {
    const m = mateForBottomPlayer(evalResult.mate, boardFlipped);
    return { text: formatSignedMate(m), favorable: m > 0 };
  }
  const cp = cpForBottomPlayer(evalResult.cp ?? 0, boardFlipped);
  return { text: formatSignedPawnsFromCp(cp), favorable: cp >= 0 };
}

/** Bar segment heights (0–100). Colors are fixed per side: light = white, dark = black. */
export function evalBarSegments(
  whitePercent: number,
  boardFlipped: boolean
): {
  topPct: number;
  bottomPct: number;
  topPlayer: "w" | "b";
  bottomPlayer: "w" | "b";
} {
  const whiteShare = whitePercent / 100;
  const whiteAtBottom = !boardFlipped;

  if (whiteAtBottom) {
    return {
      bottomPct: whiteShare * 100,
      topPct: (1 - whiteShare) * 100,
      bottomPlayer: "w",
      topPlayer: "b",
    };
  }
  return {
    topPct: whiteShare * 100,
    bottomPct: (1 - whiteShare) * 100,
    topPlayer: "w",
    bottomPlayer: "b",
  };
}

/** Mate distance from White's perspective. */
export function formatSignedMate(mate: number): string {
  if (mate > 0) return `+M${mate}`;
  if (mate < 0) return `−M${Math.abs(mate)}`;
  return "0.0";
}

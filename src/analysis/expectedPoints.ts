import type { WdlTriple } from "./wdl";
import {
  expectedPointsFromWdlWhite,
  wdlTripleToWinProb,
} from "./wdl";

export const WIN_PROB_K = 0.00368208;
export const MATE_CP = 10000;

export interface EvalLike {
  cp?: number;
  mate?: number;
  wdl?: WdlTriple;
}

export interface LineLike extends EvalLike {
  cp?: number;
  mate?: number;
  wdl?: WdlTriple;
}

/** Logistic centipawn → win % (0–100), legacy Chess.com formula. */
export function winPercentFromCp(cp: number): number {
  const clamped = Math.max(-MATE_CP, Math.min(MATE_CP, cp));
  const wc = 2 / (1 + Math.exp(-WIN_PROB_K * clamped)) - 1;
  return 50 + 50 * wc;
}

/** Win probability 0.0–1.0 for the side to move from white-relative cp. */
export function expectedPointsFromCpWhite(cpWhite: number, mover: "w" | "b"): number {
  const signed = mover === "w" ? cpWhite : -cpWhite;
  return winPercentFromCp(signed) / 100;
}

/** Expected points from a MultiPV line — prefers WDL; uses legacy logistic for UCI cp. */
export function expectedPointsFromLine(
  line: LineLike,
  mover: "w" | "b",
  _fen?: string
): number {
  if (line.mate !== undefined) {
    const whiteWinning = line.mate > 0;
    return (mover === "w") === whiteWinning ? 1 : 0;
  }
  if (line.wdl) {
    return expectedPointsFromWdlWhite(line.wdl, mover);
  }
  const cpWhite = line.cp ?? 0;
  const signed = mover === "w" ? cpWhite : -cpWhite;
  return winPercentFromCp(signed) / 100;
}

export function expectedPointsFromEval(
  evalWhite: EvalLike,
  mover: "w" | "b",
  options?: { afterDeliveredCheckmate?: boolean }
): number {
  if (options?.afterDeliveredCheckmate) return 1;
  if (evalWhite.mate !== undefined) {
    const whiteWinning = evalWhite.mate > 0;
    const moverWinning = mover === "w" ? whiteWinning : !whiteWinning;
    return moverWinning ? 1 : 0;
  }
  if (evalWhite.wdl) {
    return expectedPointsFromWdlWhite(evalWhite.wdl, mover);
  }
  return expectedPointsFromCpWhite(evalWhite.cp ?? 0, mover);
}

/** Convert mover-relative cp (positive = good for mover) to expected points. */
export function expectedPointsFromMoverCp(cp: number): number {
  return winPercentFromCp(cp) / 100;
}

/** Expected points lost: E_before − E_after (≥ 0). */
export function expectedPointsLoss(eBefore: number, eAfter: number): number {
  return Math.max(0, eBefore - eAfter);
}

export function evalToCpWhite(evalWhite: EvalLike): number {
  if (evalWhite.mate !== undefined) {
    return evalWhite.mate > 0 ? MATE_CP : -MATE_CP;
  }
  return evalWhite.cp ?? 0;
}

export { wdlTripleToWinProb };

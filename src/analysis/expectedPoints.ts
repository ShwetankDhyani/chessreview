/**
 * Chess.com Game Review — Expected Points (win probability) model.
 * All values on 0.0–1.0 scale unless noted.
 */

export const WIN_PROB_K = 0.00368208;
export const MATE_CP = 10000;

/** Logistic centipawn → win % (0–100), Chess.com formula. */
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

export function expectedPointsFromEval(
  evalWhite: { cp?: number; mate?: number },
  mover: "w" | "b"
): number {
  if (evalWhite.mate !== undefined) {
    const whiteWinning = evalWhite.mate > 0;
    const moverWinning = mover === "w" ? whiteWinning : !whiteWinning;
    return moverWinning ? 1 : 0;
  }
  return expectedPointsFromCpWhite(evalWhite.cp ?? 0, mover);
}

/** Expected points lost: E_before − E_after (≥ 0). */
export function expectedPointsLoss(eBefore: number, eAfter: number): number {
  return Math.max(0, eBefore - eAfter);
}

/** Convert mover-relative cp (positive = good for mover) to expected points. */
export function expectedPointsFromMoverCp(cp: number): number {
  return winPercentFromCp(cp) / 100;
}

export function evalToCpWhite(evalWhite: { cp?: number; mate?: number }): number {
  if (evalWhite.mate !== undefined) {
    return evalWhite.mate > 0 ? MATE_CP : -MATE_CP;
  }
  return evalWhite.cp ?? 0;
}

export function cpToEvalWhite(cpWhite: number): { cp?: number; mate?: number } {
  if (Math.abs(cpWhite) >= MATE_CP - 1) {
    return { mate: cpWhite > 0 ? 1 : -1 };
  }
  return { cp: cpWhite };
}

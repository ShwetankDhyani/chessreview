/** Win-draw-loss triple from Stockfish (per-mille, white-oriented after normalization). */
export interface WdlTriple {
  w: number;
  d: number;
  l: number;
}

/** Stockfish 17 material-scaled CP→WDL polynomial coefficients. */
const SF_AS = [-13.50030198, 40.92780883, -36.82753545, 386.8300407];
const SF_BS = [96.53354896, -165.79058388, 90.89679019, 49.29561889];
const SF_MATERIAL_ANCHOR = 58;

function evalPolynomial(coeffs: number[], x: number): number {
  return ((coeffs[0] * x + coeffs[1]) * x + coeffs[2]) * x + coeffs[3];
}

/** Convert native WDL per-mille to expected score (0–1). */
export function wdlTripleToWinProb(wdlW: number, wdlD: number, wdlL: number): number {
  const total = wdlW + wdlD + wdlL;
  if (total === 0) return 0.5;
  return (wdlW + 0.5 * wdlD) / total;
}

/** Expected points for side to move from a white-oriented WDL triple. */
export function expectedPointsFromWdlWhite(wdl: WdlTriple, mover: "w" | "b"): number {
  const whiteProb = wdlTripleToWinProb(wdl.w, wdl.d, wdl.l);
  return mover === "w" ? whiteProb : 1 - whiteProb;
}

/** Flip WDL when engine reports from black-to-move perspective → white-oriented storage. */
export function wdlToWhitePerspective(
  w: number,
  d: number,
  l: number,
  blackToMove: boolean
): WdlTriple {
  return blackToMove ? { w: l, d, l: w } : { w, d, l };
}

/**
 * SF17+ material-aware CP → win probability (fallback when native WDL absent).
 * @param cp Mover-relative centipawns (positive = good for mover)
 */
export function cpToWinProb(cp: number, material: number): number {
  const m = Math.max(17, Math.min(78, material)) / SF_MATERIAL_ANCHOR;
  const a = evalPolynomial(SF_AS, m);
  const b = evalPolynomial(SF_BS, m);
  return 1 / (1 + Math.exp(-(cp - a) / b));
}

export function scoreToWinProb(
  scoreType: "cp" | "mate",
  scoreValue: number,
  material: number
): number {
  if (scoreType === "mate") return scoreValue > 0 ? 1 : 0;
  return cpToWinProb(scoreValue, material);
}

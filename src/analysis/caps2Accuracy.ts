import type { AnalyzedMove } from "../types";

/** CAPS2 move-accuracy curve constants (Lichess / Chess.com). */
export const CAPS2_A = 103.1668100711649;
export const CAPS2_B = -0.04354415386753951;
export const CAPS2_C = -3.166924740191411;

/** Per-move score from expected-points loss (win-% points lost × 100). */
export function moveAccuracyFromEpLoss(epLoss: number): number {
  const winDiff = Math.max(0, epLoss * 100);
  if (winDiff <= 0) return 100;
  const raw = CAPS2_A * Math.exp(CAPS2_B * winDiff) + CAPS2_C;
  return Math.min(100, Math.max(0, raw + 1));
}

function harmonicMean(values: number[]): number {
  if (!values.length) return 0;
  const eps = 0.01;
  let sum = 0;
  for (const v of values) sum += 1 / Math.max(v, eps);
  return values.length / sum;
}

/**
 * CAPS2-style game accuracy: blend arithmetic + harmonic mean of per-move scores.
 * Many small inaccuracies → ~60–70; clean games → 90+.
 */
export function caps2GameAccuracy(epLosses: number[]): number {
  if (!epLosses.length) return 0;
  const scores = epLosses.map(moveAccuracyFromEpLoss);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const harmonic = harmonicMean(scores);
  const raw = (mean + harmonic) / 2;
  return Math.round(Math.min(99.9, Math.max(0, raw)) * 10) / 10;
}

export function caps2AccuracyForMoves(
  moves: AnalyzedMove[],
  color: "w" | "b"
): number {
  const losses: number[] = [];
  for (const m of moves) {
    if (m.color !== color || !m.classification || m.classification === "book") continue;
    losses.push(m.epLoss ?? 0);
  }
  return caps2GameAccuracy(losses);
}

import type { AnalyzedMove } from "../types";

/** CAPS2 move-accuracy curve constants (Lichess / Chess.com). */
export const CAPS2_A = 103.1668100711649;
export const CAPS2_B = -0.04354415386753951;
export const CAPS2_C = -3.166924740191411;

const VOLATILITY_PENALTY_FACTOR = 0.3;

/** Per-move score from expected-points loss (win-% points lost × 100). */
export function moveAccuracyFromEpLoss(epLoss: number): number {
  const wdlLossPct = Math.max(0, epLoss * 100);
  if (wdlLossPct <= 0) return 100;
  const raw = CAPS2_A * Math.exp(CAPS2_B * wdlLossPct) + CAPS2_C;
  return Math.min(100, Math.max(0, raw + 1));
}

/**
 * Game accuracy with volatility penalty — penalizes inconsistent games
 * (one blunder amid many best moves scores lower than a flat mean).
 */
export function gameAccuracyFromMoveScores(moveAccuracies: number[]): number {
  if (!moveAccuracies.length) return 0;
  const mean =
    moveAccuracies.reduce((a, b) => a + b, 0) / moveAccuracies.length;
  const variance =
    moveAccuracies.reduce((acc, v) => acc + (v - mean) ** 2, 0) /
    moveAccuracies.length;
  const stddev = Math.sqrt(variance);
  const adjusted = mean - VOLATILITY_PENALTY_FACTOR * stddev;
  return Math.round(Math.min(99.9, Math.max(0, adjusted)) * 10) / 10;
}

/** @deprecated alias — use gameAccuracyFromMoveScores */
export function caps2GameAccuracy(epLosses: number[]): number {
  return gameAccuracyFromMoveScores(epLosses.map(moveAccuracyFromEpLoss));
}

export function caps2AccuracyForMoves(
  moves: AnalyzedMove[],
  color: "w" | "b"
): number {
  const scores: number[] = [];
  for (const m of moves) {
    if (m.color !== color || !m.classification || m.classification === "book")
      continue;
    if (m.forced) continue;
    scores.push(moveAccuracyFromEpLoss(m.epLoss ?? 0));
  }
  return gameAccuracyFromMoveScores(scores);
}

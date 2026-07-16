import type { AnalyzedMove } from "../types";

/** CAPS2 / Lichess move-accuracy curve constants. */
export const CAPS2_A = 103.1668100711649;
export const CAPS2_B = -0.04354415386753951;
export const CAPS2_C = -3.166924740191411;

export interface Caps2AccuracyOptions {
  /**
   * When true, book and forced plies are omitted from the average.
   * When false (default), they count as perfect (0 EP loss).
   */
  excludeBookAndForced?: boolean;
}

/** Per-move score from expected-points loss (win-% points lost × 100). */
export function moveAccuracyFromEpLoss(epLoss: number): number {
  const winDiff = Math.max(0, epLoss * 100);
  if (winDiff <= 0) return 100;
  const raw = CAPS2_A * Math.exp(CAPS2_B * winDiff) + CAPS2_C;
  // Lichess / CAPS2 uncertainty bonus on imperfect moves
  return Math.min(100, Math.max(0, raw + 1));
}

function harmonicMean(values: number[]): number {
  if (!values.length) return 0;
  const eps = 0.01;
  let sum = 0;
  for (const v of values) sum += 1 / Math.max(v, eps);
  return values.length / sum;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  let sumSq = 0;
  for (const v of values) {
    const d = v - mean;
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / (values.length - 1));
}

function weightedMean(pairs: Array<{ value: number; weight: number }>): number {
  let num = 0;
  let den = 0;
  for (const p of pairs) {
    if (!(p.weight > 0)) continue;
    num += p.value * p.weight;
    den += p.weight;
  }
  if (den <= 0) return 0;
  return num / den;
}

/**
 * Lichess game accuracy: average of volatility-weighted mean and harmonic mean.
 * Quiet phases are down-weighted so a few critical mistakes don't get drowned —
 * and long equal stretches with tiny slips don't crush the score.
 *
 * @see https://lichess.org/page/accuracy
 */
export function caps2GameAccuracy(epLosses: number[]): number {
  if (!epLosses.length) return 0;
  const scores = epLosses.map(moveAccuracyFromEpLoss);

  // Approximate Lichess windows over move-accuracy series when we only have losses.
  // Build a pseudo win% path: start 50, step by -epLoss*100 each move (same color stream).
  const winPath: number[] = [50];
  for (const loss of epLosses) {
    winPath.push(clamp(winPath[winPath.length - 1] - loss * 100, 0, 100));
  }

  const windowSize = clamp(Math.floor(epLosses.length / 10), 2, 8);
  const weights: number[] = [];
  for (let i = 0; i < epLosses.length; i++) {
    const start = Math.max(0, Math.min(i, winPath.length - windowSize));
    const slice = winPath.slice(start, start + windowSize);
    const sd = stdev(slice);
    weights.push(clamp(sd > 0 ? sd : 0.5, 0.5, 12));
  }

  const volWeighted = weightedMean(
    scores.map((value, i) => ({ value, weight: weights[i] ?? 1 }))
  );
  const harmonic = harmonicMean(scores);
  const raw = (volWeighted + harmonic) / 2;
  return Math.round(Math.min(99.9, Math.max(0, raw)) * 10) / 10;
}

/** @deprecated alias */
export function gameAccuracyFromMoveScores(moveAccuracies: number[]): number {
  if (!moveAccuracies.length) return 0;
  const mean =
    moveAccuracies.reduce((a, b) => a + b, 0) / moveAccuracies.length;
  const harmonic = harmonicMean(moveAccuracies);
  const raw = (mean + harmonic) / 2;
  return Math.round(Math.min(99.9, Math.max(0, raw)) * 10) / 10;
}

function isBookOrForced(m: AnalyzedMove): boolean {
  return m.classification === "book" || !!m.forced;
}

/**
 * Game accuracy for one color.
 * Uses Lichess-style before→after EP loss when eBefore/eActual are present;
 * falls back to stored epLoss.
 */
export function caps2AccuracyForMoves(
  moves: AnalyzedMove[],
  color: "w" | "b",
  options: Caps2AccuracyOptions = {}
): number {
  const exclude = options.excludeBookAndForced === true;
  const losses: number[] = [];
  for (const m of moves) {
    if (m.color !== color || !m.classification) continue;
    if (isBookOrForced(m)) {
      if (exclude) continue;
      losses.push(0);
      continue;
    }
    const before = m.eBefore;
    const after = m.eActual;
    if (typeof before === "number" && typeof after === "number") {
      losses.push(Math.max(0, before - after));
    } else {
      losses.push(m.epLoss ?? 0);
    }
  }
  return caps2GameAccuracy(losses);
}

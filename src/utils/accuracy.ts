import type { ClassificationCounts, MoveClassification } from "../types";

/** Expected-points model (Lichess logistic) used for per-move loss. */
export function winPercentFromCp(cp: number): number {
  const clamped = Math.max(-1000, Math.min(1000, cp));
  const wc = 2 / (1 + Math.exp(-0.00368208 * clamped)) - 1;
  return 50 + 50 * wc;
}

export function expectedPointsLost(cpAfterBest: number, cpAfterActual: number): number {
  const best = winPercentFromCp(cpAfterBest);
  const actual = winPercentFromCp(cpAfterActual);
  return Math.max(0, (best - actual) / 100);
}

/** Visible label quality — canonical mapping for summary accuracy. */
export const CLASSIFICATION_ACCURACY: Record<
  Exclude<MoveClassification, null>,
  number
> = {
  brilliant: 100,
  great: 99,
  best: 100,
  excellent: 96,
  good: 91,
  book: 100,
  inaccuracy: 79,
  mistake: 63,
  blunder: 38,
};

const COUNTED_CLASSIFICATIONS = Object.keys(
  CLASSIFICATION_ACCURACY
) as Array<Exclude<MoveClassification, null>>;

/** Display calibration that preserves strong games and avoids contradictory compression. */
export function caps2DisplayAccuracy(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  const r = Math.max(0, Math.min(100, raw));
  if (r <= 50) return Math.round(r * 0.92 * 10) / 10;
  if (r >= 96) {
    const headroom = 99.9 - r;
    return Math.round(Math.min(99.9, r + headroom * 0.85) * 10) / 10;
  }
  return Math.round(r * 10) / 10;
}

/** Summary accuracy from move-breakdown counts (single canonical path). */
export function accuracyFromClassificationCounts(
  counts: ClassificationCounts
): number {
  let total = 0;
  let weighted = 0;
  for (const key of COUNTED_CLASSIFICATIONS) {
    const n = counts[key];
    if (n <= 0) continue;
    weighted += n * CLASSIFICATION_ACCURACY[key];
    total += n;
  }
  if (total === 0) return 0;
  return caps2DisplayAccuracy(weighted / total);
}

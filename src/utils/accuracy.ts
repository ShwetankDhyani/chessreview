import type {
  AnalyzedMove,
  ClassificationCounts,
  MoveClassification,
} from "../types";

const ACC_A = 103.1668100711649;
const ACC_B = -0.04354415386753951;
const ACC_C = -3.166924740191411;

/**
 * CAPS2-style per-move grade (Chess.com: "best" is not 100 on the test).
 * Used as a ceiling so engine-tiny losses cannot inflate labeled errors.
 */
export const MOVE_GRADE_SCORE: Record<
  Exclude<MoveClassification, null>,
  number
> = {
  brilliant: 100,
  great: 98,
  best: 97,
  excellent: 93,
  good: 86,
  book: 97,
  inaccuracy: 76,
  mistake: 58,
  blunder: 35,
};

/** @deprecated alias — same as MOVE_GRADE_SCORE */
export const CLASSIFICATION_ACCURACY = MOVE_GRADE_SCORE;

const COUNTED_CLASSIFICATIONS = Object.keys(
  MOVE_GRADE_SCORE
) as Array<Exclude<MoveClassification, null>>;

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

/** Per-move accuracy from expected-points loss (CAPS curve). */
export function moveAccuracyFromEpLoss(epLoss: number): number {
  const winDiff = Math.max(0, epLoss * 100);
  if (winDiff <= 0) return 100;
  const raw = ACC_A * Math.exp(ACC_B * winDiff) + ACC_C;
  return Math.min(100, Math.max(0, raw + 1));
}

function harmonicMean(values: number[]): number {
  if (values.length === 0) return 0;
  const epsilon = 0.01;
  let sum = 0;
  for (const v of values) {
    sum += 1 / Math.max(v, epsilon);
  }
  return values.length / sum;
}

function arithmeticMean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Single-ply score: engine CAPS capped by classification grade (CAPS2 parity). */
export function plyAccuracyScore(move: AnalyzedMove): number {
  const c = move.classification;
  if (!c) return 0;

  const gradeCap = MOVE_GRADE_SCORE[c];
  const epLoss = move.epLoss ?? 0;
  const epScore = moveAccuracyFromEpLoss(epLoss);
  return Math.min(epScore, gradeCap);
}

/**
 * CAPS2 game compression — many "best" moves must not print as 99%+.
 * Maps raw 92–100 into roughly 92–97 for display.
 */
export function caps2GameCalibration(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 92) return raw;
  const headroom = Math.min(8, raw - 92);
  return 92 + headroom * 0.625;
}

/**
 * Game accuracy: blend of mean + harmonic on per-move scores, then CAPS2 calibration.
 */
export function gameAccuracyFromMoves(
  moves: AnalyzedMove[],
  color: "w" | "b"
): number {
  const scores: number[] = [];
  for (const m of moves) {
    if (m.color !== color || !m.classification) continue;
    scores.push(plyAccuracyScore(m));
  }
  if (!scores.length) return 0;

  const mean = arithmeticMean(scores);
  const harmonic = harmonicMean(scores);
  const raw = (mean + harmonic) / 2;
  return displayAccuracy(caps2GameCalibration(raw));
}

export function caps2DisplayAccuracy(raw: number): number {
  return displayAccuracy(caps2GameCalibration(raw));
}

export function displayAccuracy(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  const r = Math.max(0, Math.min(100, raw));
  return Math.round(Math.min(99.9, r) * 10) / 10;
}

/** Label-only average (diagnostics); headline uses gameAccuracyFromMoves. */
export function accuracyFromClassificationCounts(
  counts: ClassificationCounts
): number {
  let total = 0;
  let weighted = 0;
  for (const key of COUNTED_CLASSIFICATIONS) {
    const n = counts[key];
    if (n <= 0) continue;
    weighted += n * MOVE_GRADE_SCORE[key];
    total += n;
  }
  if (total === 0) return 0;
  return displayAccuracy(caps2GameCalibration(weighted / total));
}

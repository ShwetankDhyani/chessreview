import type {
  AnalyzedMove,
  ClassificationCounts,
  MoveClassification,
} from "../types";

const ACC_A = 103.1668100711649;
const ACC_B = -0.04354415386753951;
const ACC_C = -3.166924740191411;

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

/** Per-move accuracy from expected-points loss (Chess.com CAPS / Lichess curve). */
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

/** Mover win chance 0–1 from stored eval (white-relative cp flipped for Black). */
export function moverWinChance(
  move: AnalyzedMove,
  when: "before" | "after"
): number {
  const e = when === "before" ? move.evalBefore : move.evalAfter;
  if (!e) return 0.5;
  if (e.mate !== undefined) {
    const whiteWinning = e.mate > 0;
    const playerWinning = move.color === "w" ? whiteWinning : !whiteWinning;
    return playerWinning ? 0.99 : 0.01;
  }
  const cp = e.cp ?? 0;
  const signed = move.color === "w" ? cp : -cp;
  return winPercentFromCp(signed) / 100;
}

/** Slight dampening when already winning — avoids absurdly low % on throwaways in won games. */
export function effectiveEpLossForAccuracy(move: AnalyzedMove): number {
  const epLoss = move.epLoss ?? 0;
  if (epLoss <= 0) return 0;

  const before = moverWinChance(move, "before");
  const after = moverWinChance(move, "after");

  if (before >= 0.92 && after >= 0.78) return epLoss * 0.35;
  if (before >= 0.85 && after >= 0.68) return epLoss * 0.5;
  if (before >= 0.75 && after >= 0.58) return epLoss * 0.65;

  return epLoss;
}

/** Single-ply score used for game accuracy — driven by engine loss, not label buckets. */
export function plyAccuracyScore(move: AnalyzedMove): number {
  if (!move.classification) return 0;
  if (move.classification === "book") return 100;
  return moveAccuracyFromEpLoss(effectiveEpLossForAccuracy(move));
}

/**
 * Game accuracy: Lichess-style blend of mean + harmonic mean on per-move CAPS scores.
 * Harmonic mean punishes mistakes so 2 inaccuracies + 1 mistake cannot read as 99%.
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
  return displayAccuracy(raw);
}

/**
 * Display value — no artificial boost toward 99.9.
 * Raw engine-based scores are shown as-is (rounded), capped at 99.9.
 */
export function caps2DisplayAccuracy(raw: number): number {
  return displayAccuracy(raw);
}

export function displayAccuracy(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  const r = Math.max(0, Math.min(100, raw));
  return Math.round(Math.min(99.9, r) * 10) / 10;
}

/** Legacy label map — used only for diagnostics, not headline game %. */
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

/** Label average (informational); headline accuracy uses gameAccuracyFromMoves. */
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
  return displayAccuracy(weighted / total);
}

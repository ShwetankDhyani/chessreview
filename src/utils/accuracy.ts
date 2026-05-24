import type {
  AnalyzedMove,
  ClassificationCounts,
  MoveClassification,
} from "../types";

// Lichess per-move + game accuracy (open source)
// https://lichess.org/page/accuracy
//
// Game accuracy aligns with Chess.com CAPS2 expectations:
// - Book moves count as 100% (scored like "best")
// - Near-perfect raw scores can display up to 99.9
// - Typical games still spread mostly in the ~50–95 band

const ACC_A = 103.1668100711649;
const ACC_B = -0.04354415386753951;
const ACC_C = -3.166924740191411;
const INITIAL_CP = 15;

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

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  let v = 0;
  for (const x of values) {
    const d = x - mean;
    v += d * d;
  }
  return Math.sqrt(v / values.length);
}

function safeSlice(values: number[], start: number, end: number): number[] {
  const s = Math.max(0, Math.min(start, values.length));
  const e = Math.max(s, Math.min(end, values.length));
  return values.slice(s, e);
}

function buildSlidingWindows(values: number[], windowSize: number, n: number): number[][] {
  const windows: number[][] = [];
  const firstWindow = safeSlice(values, 0, windowSize);
  const padCount = Math.max(0, windowSize - 2);

  for (let i = 0; i < n; i++) {
    if (i < padCount) {
      windows.push(firstWindow);
    } else {
      const start = i - padCount;
      windows.push(safeSlice(values, start, start + windowSize));
    }
  }
  return windows;
}

function computePlyWeights(allWinPcts: number[], numMoves: number): number[] {
  if (numMoves === 0) return [];
  let windowSize = Math.floor(numMoves / 10);
  windowSize = Math.min(8, Math.max(2, windowSize));
  const windows = buildSlidingWindows(allWinPcts, windowSize, numMoves);
  return windows.map((w) => {
    const sd = standardDeviation(w);
    return Math.min(12, Math.max(0.5, sd));
  });
}

function weightedMean(values: number[], weights: number[]): number {
  let sumWV = 0;
  let sumW = 0;
  for (let i = 0; i < values.length; i++) {
    const w = weights[i] ?? 1;
    sumWV += values[i] * w;
    sumW += w;
  }
  if (sumW === 0) {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  return sumWV / sumW;
}

function arithmeticMean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function lichessGameAccuracy(accuracies: number[], weights: number[]): number {
  if (accuracies.length === 0) return 0;
  if (accuracies.length === 1) return accuracies[0];
  return (weightedMean(accuracies, weights) + harmonicMean(accuracies)) / 2;
}

/** Visible label quality — must match the move breakdown table exactly. */
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

function classificationPlyAccuracy(m: AnalyzedMove): number {
  const c = m.classification;
  if (c && c in CLASSIFICATION_ACCURACY) {
    return CLASSIFICATION_ACCURACY[c];
  }
  return plyAccuracy(m);
}

/** Lichess up-weights volatile positions; cap that when the player already had an edge. */
function adjustedPlyWeight(base: number, move: AnalyzedMove): number {
  const before = moverWinChance(move, "before");
  if (before >= 0.68) return Math.min(base, 2.5);
  if (before >= 0.55) return Math.min(base, 4);
  return base;
}

const COUNTED_CLASSIFICATIONS = Object.keys(
  CLASSIFICATION_ACCURACY
) as Array<Exclude<MoveClassification, null>>;

/**
 * Overall accuracy from the same counts shown in the review sidebar.
 * Weighted average — no hidden ply drops (e.g. mate lines still count as best).
 */
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

/**
 * Display calibration — must not contradict the move breakdown.
 * High raw scores stay high; only weak games are compressed slightly.
 */
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

function displayGameAccuracy(labelScores: number[]): number {
  if (!labelScores.length) return 0;
  return caps2DisplayAccuracy(arithmeticMean(labelScores));
}

function skipMove(m: AnalyzedMove): boolean {
  // Classified plies always count — mate sequences are often labeled "best" in the chart.
  if (m.classification) return false;
  if (m.evalAfter?.mate !== undefined) return true;
  if ((m.epLoss ?? 0) >= 0.99) return true;
  return false;
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

/**
 * When already winning, the same centipawn slip costs less in accuracy
 * (matches how Chess.com-style reviews treat throwaways in won positions).
 */
export function effectiveEpLossForAccuracy(move: AnalyzedMove): number {
  const epLoss = move.epLoss ?? 0;
  if (epLoss <= 0) return 0;

  const before = moverWinChance(move, "before");
  const after = moverWinChance(move, "after");

  if (before >= 0.88 && after >= 0.72) return epLoss * 0.22;
  if (before >= 0.78 && after >= 0.62) return epLoss * 0.4;
  if (before >= 0.68 && after >= 0.52) return epLoss * 0.58;

  return epLoss;
}

function plyAccuracy(m: AnalyzedMove): number {
  if (m.classification === "book") return 100;
  return moveAccuracyFromEpLoss(effectiveEpLossForAccuracy(m));
}

function phaseDisplayAccuracy(labelValues: number[]): number {
  if (!labelValues.length) return 0;
  return displayGameAccuracy(labelValues);
}

export interface PlayerAccuracyResult {
  game: number;
  phase: { opening: number; middlegame: number; endgame: number };
}

export function computePlayerAccuracy(
  moves: AnalyzedMove[],
  color: "w" | "b",
  _resolvedCpWhite: Map<string, number>,
  phaseForMove: (m: AnalyzedMove, idx: number) => "opening" | "middlegame" | "endgame"
): PlayerAccuracyResult {
  const allLabelAcc: number[] = [];
  const phaseLabel: Record<"opening" | "middlegame" | "endgame", number[]> = {
    opening: [],
    middlegame: [],
    endgame: [],
  };

  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    if (m.color !== color || skipMove(m)) continue;

    const labelAcc = classificationPlyAccuracy(m);
    allLabelAcc.push(labelAcc);

    const phase = phaseForMove(m, i);
    phaseLabel[phase].push(labelAcc);
  }

  return {
    game: displayGameAccuracy(allLabelAcc),
    phase: {
      opening: phaseDisplayAccuracy(phaseLabel.opening),
      middlegame: phaseDisplayAccuracy(phaseLabel.middlegame),
      endgame: phaseDisplayAccuracy(phaseLabel.endgame),
    },
  };
}

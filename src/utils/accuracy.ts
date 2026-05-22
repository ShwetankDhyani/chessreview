import type { AnalyzedMove } from "../types";

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

function lichessGameAccuracy(accuracies: number[], weights: number[]): number {
  if (accuracies.length === 0) return 0;
  if (accuracies.length === 1) return accuracies[0];
  return (weightedMean(accuracies, weights) + harmonicMean(accuracies)) / 2;
}

/**
 * Chess.com CAPS2-style display calibration.
 * Strong games (high raw) reach ~99.9; typical games stay mostly ~50–95.
 */
export function caps2DisplayAccuracy(rawLichess: number): number {
  if (!Number.isFinite(rawLichess)) return 0;
  const r = Math.max(0, Math.min(100, rawLichess));

  if (r <= 50) return Math.round(r * 0.92 * 10) / 10;

  if (r >= 88) {
    const headroom = 99.9 - r;
    return Math.round(Math.min(99.9, r + headroom * 0.75) * 10) / 10;
  }

  const excess = r - 50;
  const calibrated = 50 + excess * 0.88;
  return Math.round(Math.min(97, Math.max(0, calibrated)) * 10) / 10;
}

function skipMove(m: AnalyzedMove): boolean {
  if (m.evalAfter?.mate !== undefined) return true;
  if ((m.epLoss ?? 0) >= 0.99) return true;
  return false;
}

function plyAccuracy(m: AnalyzedMove): number {
  if (m.classification === "book") return 100;
  return moveAccuracyFromEpLoss(m.epLoss ?? 0);
}

export interface PlayerAccuracyResult {
  game: number;
  phase: { opening: number; middlegame: number; endgame: number };
}

export function computePlayerAccuracy(
  moves: AnalyzedMove[],
  color: "w" | "b",
  resolvedCpWhite: Map<string, number>,
  phaseForMove: (m: AnalyzedMove, idx: number) => "opening" | "middlegame" | "endgame"
): PlayerAccuracyResult {
  const allWinPcts: number[] = [winPercentFromCp(INITIAL_CP)];
  for (const m of moves) {
    const cp = resolvedCpWhite.get(m.fenAfter) ?? 0;
    allWinPcts.push(winPercentFromCp(cp));
  }

  const plyWeights = computePlyWeights(allWinPcts, moves.length);

  const allAcc: number[] = [];
  const allWeights: number[] = [];
  const phaseAcc: Record<"opening" | "middlegame" | "endgame", number[]> = {
    opening: [],
    middlegame: [],
    endgame: [],
  };

  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    if (m.color !== color || skipMove(m)) continue;

    const acc = plyAccuracy(m);
    allAcc.push(acc);
    allWeights.push(plyWeights[i] ?? 1);

    const phase = phaseForMove(m, i);
    phaseAcc[phase].push(acc);
  }

  const rawGame = lichessGameAccuracy(allAcc, allWeights);

  return {
    game: caps2DisplayAccuracy(rawGame),
    phase: {
      opening: phaseAcc.opening.length ? harmonicMean(phaseAcc.opening) : 0,
      middlegame: phaseAcc.middlegame.length
        ? harmonicMean(phaseAcc.middlegame)
        : 0,
      endgame: phaseAcc.endgame.length ? harmonicMean(phaseAcc.endgame) : 0,
    },
  };
}

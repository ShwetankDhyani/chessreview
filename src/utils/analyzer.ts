import { Chess, type Move as ChessMove } from "chess.js";
import { evaluateFensConsensus } from "../engine/evaluationService";
import {
  expectedPointsLost,
  gameAccuracyFromMoves,
  winPercentFromCp,
} from "./accuracy";
import {
  BOOK_MAX_PLY,
  EP_THRESHOLDS,
  couldBeBookMove,
  classifyMove,
  detectVoluntarySacrifice,
  exchangeBalanceAfterMove,
  hasReliableEval,
  isEngineTopMove,
  prevMoverWinPercent,
  qualifiesForBrilliant,
} from "./moveClassification";
import type {
  AnalyzedMove,
  ClassificationCounts,
  EvalResult,
  KeyMoment,
  MoveClassification,
  ReviewCoverage,
  ReviewResult,
  ReviewRun,
  ReviewSummary,
} from "../types";

const MIN_CLASSIFY_DEPTH = 10;
const PASS1_END = 0.72;
const PASS2_END = 0.98;

function hashText(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return `h${(hash >>> 0).toString(16)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildRunId(pgn: string): string {
  return `${Date.now().toString(36)}-${hashText(pgn).slice(0, 8)}`;
}

function evalToCp(e: EvalResult): number {
  if (e.mate !== undefined) return e.mate > 0 ? 10000 : -10000;
  return e.cp ?? 0;
}

function isUsableEval(e: EvalResult | undefined): e is EvalResult {
  return !!e && e.depth > 0 && (e.cp !== undefined || e.mate !== undefined);
}

function applyUci(fen: string, uci: string): string | null {
  try {
    const c = new Chess(fen);
    c.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4] as "q" | "r" | "b" | "n" | undefined,
    });
    return c.fen();
  } catch {
    return null;
  }
}

function reportAnalysisProgress(
  onProgress: ((done: number, total: number) => void) | undefined,
  fraction: number
) {
  const clamped = Math.min(1, Math.max(0, fraction));
  onProgress?.(Math.round(clamped * 100), 100);
}

function emptyCounts(): ClassificationCounts {
  return {
    brilliant: 0,
    great: 0,
    best: 0,
    excellent: 0,
    good: 0,
    book: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  };
}

function detectPhase(
  fen: string,
  stillInBook: boolean,
  moveIdx: number
): "opening" | "middlegame" | "endgame" {
  if (stillInBook || moveIdx < 12) return "opening";
  const board = fen.split(" ")[0];
  let material = 0;
  for (const ch of board) {
    const lower = ch.toLowerCase();
    if (lower === "q") material += 9;
    else if (lower === "r") material += 5;
    else if (lower === "b" || lower === "n") material += 3;
    else if (lower === "p") material += 1;
  }
  if (material <= 24) return "endgame";
  return "middlegame";
}

function buildCoverage(moves: AnalyzedMove[]): ReviewCoverage {
  const coverage: ReviewCoverage = {
    totalPlies: moves.length,
    classifiedPlies: 0,
    verifiedPlies: 0,
    unverifiedPlies: 0,
    unverifiedReasons: {
      missing_eval: 0,
      shallow_depth: 0,
      high_disagreement: 0,
    },
  };
  for (const m of moves) {
    if (m.classification) coverage.classifiedPlies++;
    if (m.verified) coverage.verifiedPlies++;
    else {
      coverage.unverifiedPlies++;
      if (m.unverifiedReason) coverage.unverifiedReasons[m.unverifiedReason]++;
    }
  }
  return coverage;
}

function buildSummary(moves: AnalyzedMove[]): ReviewSummary {
  const white = emptyCounts();
  const black = emptyCounts();
  const keyMoments: KeyMoment[] = [];
  const stillInBookAt: boolean[] = [];
  let bookPhaseEnded = false;

  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    const c = m.classification;
    stillInBookAt.push(!bookPhaseEnded);

    if (c) {
      const counts = m.color === "w" ? white : black;
      counts[c]++;
    }

    const swing = Math.abs(m.deltaE);
    if (swing >= 1.0 || c === "brilliant" || c === "great" || c === "mistake" || c === "blunder") {
      keyMoments.push({
        moveIdx: i,
        san: m.san,
        moveNumber: m.moveNumber,
        color: m.color,
        classification: c,
        swing,
      });
    }

    if (!bookPhaseEnded && c !== null && c !== "book") bookPhaseEnded = true;
  }

  const phaseWhite = {
    opening: emptyCounts(),
    middlegame: emptyCounts(),
    endgame: emptyCounts(),
  };
  const phaseBlack = {
    opening: emptyCounts(),
    middlegame: emptyCounts(),
    endgame: emptyCounts(),
  };

  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    const c = m.classification;
    if (!c) continue;
    const phase = detectPhase(m.fenBefore, stillInBookAt[i] ?? false, i);
    const bucket = m.color === "w" ? phaseWhite[phase] : phaseBlack[phase];
    bucket[c]++;
  }

  const phaseAccuracyFromMoves = (
    phase: "opening" | "middlegame" | "endgame"
  ) => ({
    white: gameAccuracyFromMoves(
      moves.filter(
        (m, idx) =>
          m.color === "w" &&
          m.classification &&
          detectPhase(m.fenBefore, stillInBookAt[idx] ?? false, idx) === phase
      ),
      "w"
    ),
    black: gameAccuracyFromMoves(
      moves.filter(
        (m, idx) =>
          m.color === "b" &&
          m.classification &&
          detectPhase(m.fenBefore, stillInBookAt[idx] ?? false, idx) === phase
      ),
      "b"
    ),
  });

  return {
    white,
    black,
    accuracy: {
      white: gameAccuracyFromMoves(moves, "w"),
      black: gameAccuracyFromMoves(moves, "b"),
    },
    phaseAccuracy: {
      opening: phaseAccuracyFromMoves("opening"),
      middlegame: phaseAccuracyFromMoves("middlegame"),
      endgame: phaseAccuracyFromMoves("endgame"),
    },
    keyMoments,
    coverage: buildCoverage(moves),
    accuracyMeta: {
      method: "ep_loss_caps",
      formulaVersion: "v2.1-ep-harmonic",
    },
  };
}

export async function analyzePgn(
  pgn: string,
  onProgress?: (done: number, total: number) => void,
  depth = 16
): Promise<ReviewResult> {
  const startedAt = nowIso();
  const runId = buildRunId(pgn);
  const chess = new Chess();
  chess.loadPgn(pgn);
  const history = chess.history({ verbose: true });

  const fensList: string[] = [];
  const tmp = new Chess();
  fensList.push(tmp.fen());
  for (const m of history) {
    tmp.move(m.san);
    fensList.push(tmp.fen());
  }

  onProgress?.(2, 100);

  const fastDepth = Math.max(10, Math.min(depth, 12));
  const deepDepth = Math.max(fastDepth + 2, depth);
  const maxDeepPositions = Math.max(24, Math.min(96, Math.floor(fensList.length * 0.45)));

  const evalCache = new Map<string, EvalResult>();
  const pass1 = await evaluateFensConsensus(
    fensList,
    {
      requestedDepth: depth,
      fastDepth,
      deepDepth,
      minVerifiedDepth: MIN_CLASSIFY_DEPTH,
      maxDeepPositions,
      disagreementCpForLowConfidence: 90,
    },
    (d, t) => {
      if (t > 0) reportAnalysisProgress(onProgress, 0.04 + (d / t) * (PASS1_END - 0.04));
    }
  );
  for (const [fen, e] of pass1.evals) evalCache.set(fen, e);
  reportAnalysisProgress(onProgress, PASS1_END);

  const extraFens: string[] = [];
  for (let i = 0; i < history.length; i++) {
    const fenBefore = fensList[i];
    const ev = evalCache.get(fenBefore);
    const bestMove = ev?.bestMove;
    if (!bestMove) continue;
    const played = (history[i].from + history[i].to + (history[i].promotion ?? "")).slice(0, 4);
    if (bestMove.slice(0, 4) === played) continue;
    const bestFen = applyUci(fenBefore, bestMove);
    if (bestFen && !evalCache.has(bestFen)) extraFens.push(bestFen);
  }

  if (extraFens.length > 0) {
    const uniqueExtra = [...new Set(extraFens)];
    const pass2 = await evaluateFensConsensus(
      uniqueExtra,
      {
        requestedDepth: depth,
        fastDepth: Math.max(fastDepth, 12),
        deepDepth,
        minVerifiedDepth: MIN_CLASSIFY_DEPTH,
        maxDeepPositions: uniqueExtra.length,
        disagreementCpForLowConfidence: 90,
      },
      (d, t) => {
        if (t > 0) reportAnalysisProgress(onProgress, PASS1_END + (d / t) * (PASS2_END - PASS1_END));
      }
    );
    for (const [fen, e] of pass2.evals) evalCache.set(fen, e);
  }
  reportAnalysisProgress(onProgress, PASS2_END);

  const strictCp = new Map<string, number>();
  for (const [fen, e] of evalCache) {
    if (isUsableEval(e)) strictCp.set(fen, evalToCp(e));
  }

  let lastChartCp = 0;
  const chartCpWhite = new Map<string, number>();
  for (const fen of fensList) {
    const e = evalCache.get(fen);
    if (isUsableEval(e)) lastChartCp = evalToCp(e);
    chartCpWhite.set(fen, lastChartCp);
  }

  const moves: AnalyzedMove[] = [];
  let bookEnded = false;

  for (let i = 0; i < history.length; i++) {
    const move = history[i];
    const fenBefore = fensList[i];
    const fenAfter = fensList[i + 1];
    const evalBefore =
      evalCache.get(fenBefore) ??
      ({
        cp: 0,
        depth: 0,
        source: "local",
        verified: false,
        confidence: 0.2,
        unverifiedReason: "missing_eval",
      } satisfies EvalResult);
    const evalAfter =
      evalCache.get(fenAfter) ??
      ({
        cp: 0,
        depth: 0,
        source: "local",
        verified: false,
        confidence: 0.2,
        unverifiedReason: "missing_eval",
      } satisfies EvalResult);

    const sign = move.color === "w" ? 1 : -1;
    const cpBefore = sign * (strictCp.get(fenBefore) ?? 0);
    const cpAfter = sign * (strictCp.get(fenAfter) ?? 0);
    const clamp = (v: number) => Math.max(-1500, Math.min(1500, v));
    const clampClass = (v: number) => Math.max(-600, Math.min(600, v));
    const cpBeforeClamped = clamp(cpBefore);
    const cpAfterClamped = clamp(cpAfter);
    const deltaCP = clampClass(cpBefore) - clampClass(cpAfter);

    const wpBeforePct = winPercentFromCp(cpBeforeClamped);
    const wpAfterActualPct = winPercentFromCp(cpAfterClamped);

    const bestMoveUci = evalBefore.bestMove;
    let cpAfterBest = cpBeforeClamped;
    let fenBest: string | null = null;
    if (bestMoveUci) {
      fenBest = applyUci(fenBefore, bestMoveUci);
      if (fenBest && strictCp.has(fenBest)) {
        cpAfterBest = sign * strictCp.get(fenBest)!;
      }
    }
    const epLoss = expectedPointsLost(cpAfterBest, cpAfterClamped);
    const hasBestLineEval = !bestMoveUci || (fenBest !== null && strictCp.has(fenBest));
    const bothEvaluated = hasReliableEval(
      evalBefore,
      evalAfter,
      strictCp.has(fenBefore),
      strictCp.has(fenAfter),
      hasBestLineEval
    );
    const playerUci = (move.from + move.to + (move.promotion ?? "")).toLowerCase();
    const isTop = isEngineTopMove(epLoss, playerUci, bestMoveUci);

    const prevWpForMoverPct = prevMoverWinPercent(
      fensList,
      i,
      move.color,
      chartCpWhite,
      clamp,
      winPercentFromCp
    );

    const couldBeBook = bothEvaluated
      ? couldBeBookMove(i, bookEnded, epLoss, Math.abs(cpBeforeClamped), isTop)
      : false;

    const exchangeBal = exchangeBalanceAfterMove(fenBefore, playerUci, move.color);
    const isSacrifice = detectVoluntarySacrifice(
      fenBefore,
      playerUci,
      move.color,
      history as ChessMove[],
      i
    );
    const brilliantSac = qualifiesForBrilliant(
      fenBefore,
      playerUci,
      move.color,
      history as ChessMove[],
      i,
      exchangeBal
    );
    const hasMateScore = evalBefore.mate !== undefined || evalAfter.mate !== undefined;
    const classification: MoveClassification = bothEvaluated
      ? classifyMove({
          epLoss,
          isBook: couldBeBook,
          qualifiesBrilliant: brilliantSac,
          wpBeforePct,
          wpAfterActualPct,
          isTop,
          prevWpForMoverPct,
          hasMateScore,
        })
      : null;

    const verified = !!(bothEvaluated && evalBefore.verified && evalAfter.verified);
    const confidence = Math.min(evalBefore.confidence ?? 0.5, evalAfter.confidence ?? 0.5);
    const unverifiedReason =
      evalBefore.unverifiedReason ?? evalAfter.unverifiedReason ?? (verified ? undefined : "shallow_depth");

    const inOpeningBook =
      classification === "book" ||
      couldBeBook ||
      (!bookEnded &&
        i < BOOK_MAX_PLY &&
        bothEvaluated &&
        epLoss <= EP_THRESHOLDS.inaccuracy);

    if (classification !== "book" && classification !== null) bookEnded = true;

    let bestMoveSan: string | undefined;
    let pvLine: string[] | undefined;
    if (bestMoveUci && bothEvaluated) {
      try {
        const tmpChess = new Chess(fenBefore);
        const bm = tmpChess.move({
          from: bestMoveUci.slice(0, 2),
          to: bestMoveUci.slice(2, 4),
          promotion: bestMoveUci[4] as "q" | "r" | "b" | "n" | undefined,
        });
        if (bm) {
          bestMoveSan = bm.san;
          pvLine = [];
          for (const uciMove of (evalBefore.pv ?? []).slice(1, 6)) {
            try {
              const m = tmpChess.move({
                from: uciMove.slice(0, 2),
                to: uciMove.slice(2, 4),
                promotion: uciMove[4] as "q" | "r" | "b" | "n" | undefined,
              });
              if (m) pvLine.push(m.san);
              else break;
            } catch {
              break;
            }
          }
        }
      } catch {
        // no-op: keep SAN hints empty on malformed PVs
      }
    }

    moves.push({
      moveNumber: Math.floor(i / 2) + 1,
      color: move.color,
      san: move.san,
      uci: move.from + move.to + (move.promotion ?? ""),
      fenBefore,
      fenAfter,
      evalBefore,
      evalAfter,
      eBest: cpAfterBest,
      eActual: cpAfterClamped,
      deltaE: deltaCP / 100,
      epLoss,
      classification,
      inOpeningBook,
      isSacrifice,
      bestMove: bestMoveUci,
      bestMoveSan,
      pvLine,
      verified,
      confidence,
      unverifiedReason,
      reviewRunId: runId,
    });
  }

  reportAnalysisProgress(onProgress, 1);
  const summary = buildSummary(moves);
  const run: ReviewRun = {
    runId,
    engineVersion: "stockfish-consensus-v1",
    startedAt,
    finishedAt: nowIso(),
    requestedDepth: depth,
    fastDepth,
    deepDepth,
    backendPolicy: "consensus",
    pgnHash: hashText(pgn),
  };

  return { run, moves, summary };
}

import { Chess } from "chess.js";
import type {
  AnalyzedMove,
  ClassificationCounts,
  EvalResult,
  ReviewResult,
  ReviewRun,
  ReviewSummary,
  MoveClassification,
} from "../types";
import { caps2AccuracyForMoves } from "./caps2Accuracy";
import {
  classifyReviewMove,
  epLossFromPlayed,
  type ClassifyReviewInput,
} from "./classifyReviewMove";
import {
  expectedPointsFromEval,
} from "./expectedPoints";
import { checkOpeningBookSync } from "./openingBook";
import {
  analyzePositionMultiPv,
  lineCpWhite,
  positionAnalysisToEvalResult,
} from "./stockfishClient";
import type { PositionAnalysis, ReviewEngineOptions } from "./types";
import { detectPieceSacrifice } from "./detectPieceSacrifice";

const MIN_DEPTH = 18;
const DEFAULT_MULTIPV = 2;

function hashText(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) hash = (hash * 33) ^ value.charCodeAt(i);
  return `h${(hash >>> 0).toString(16)}`;
}

function nowIso(): string {
  return new Date().toISOString();
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

function cpForMover(cpWhite: number, mover: "w" | "b"): number {
  return mover === "w" ? cpWhite : -cpWhite;
}

function buildSummary(moves: AnalyzedMove[]): ReviewSummary {
  const white = emptyCounts();
  const black = emptyCounts();

  for (const m of moves) {
    const c = m.classification;
    if (!c) continue;
    const bucket = m.color === "w" ? white : black;
    bucket[c]++;
  }

  return {
    white,
    black,
    accuracy: {
      white: caps2AccuracyForMoves(moves, "w"),
      black: caps2AccuracyForMoves(moves, "b"),
    },
    coverage: {
      totalPlies: moves.length,
      classifiedPlies: moves.filter((m) => m.classification).length,
      verifiedPlies: moves.filter((m) => m.verified).length,
      unverifiedPlies: moves.filter((m) => !m.verified).length,
      unverifiedReasons: {
        missing_eval: moves.filter((m) => m.unverifiedReason === "missing_eval").length,
        shallow_depth: moves.filter((m) => m.unverifiedReason === "shallow_depth").length,
        high_disagreement: 0,
      },
    },
    accuracyMeta: {
      method: "chesscom_ep_v3",
      formulaVersion: "v3.0-chesscom-ep-multipv",
    },
  };
}

export interface GameReviewOptions extends ReviewEngineOptions {
  onProgress?: (done: number, total: number) => void;
  openingBook?: ReadonlySet<string>;
}

/**
 * Sequential Chess.com-style game review: MultiPV Stockfish WASM per position,
 * expected-points classification, CAPS2 accuracy.
 */
export async function analyzeGameReview(
  pgn: string,
  options: GameReviewOptions = {}
): Promise<ReviewResult> {
  const startedAt = nowIso();
  const runId = `${Date.now().toString(36)}-${hashText(pgn).slice(0, 8)}`;
  const depth = Math.max(options.minDepth ?? MIN_DEPTH, options.depth ?? MIN_DEPTH);
  const multiPv = options.multiPv ?? DEFAULT_MULTIPV;

  const chess = new Chess();
  chess.loadPgn(pgn);
  const history = chess.history({ verbose: true });

  const fens: string[] = [];
  const tmp = new Chess();
  fens.push(tmp.fen());
  for (const m of history) {
    tmp.move(m.san);
    fens.push(tmp.fen());
  }

  const uniqueFens = [...new Set(fens)];
  const analysisCache = new Map<string, PositionAnalysis>();
  const totalSteps = uniqueFens.length + history.length;
  let doneSteps = 0;

  const report = () => {
    doneSteps++;
    options.onProgress?.(Math.min(doneSteps, totalSteps), totalSteps);
  };

  for (const fen of uniqueFens) {
    const analysis = await analyzePositionMultiPv(fen, { depth, multiPv });
    analysisCache.set(fen, analysis);
    report();
  }

  const moves: AnalyzedMove[] = [];
  let priorClass: MoveClassification | null = null;
  let priorEpLoss = 0;
  let bookEnded = false;

  for (let i = 0; i < history.length; i++) {
    const move = history[i];
    const fenBefore = fens[i];
    const fenAfter = fens[i + 1];
    const mover = move.color;

    const beforeAnalysis = analysisCache.get(fenBefore);
    const afterAnalysis = analysisCache.get(fenAfter);

    const evalBefore: EvalResult = beforeAnalysis
      ? positionAnalysisToEvalResult(beforeAnalysis, 0)
      : { cp: 0, depth: 0, source: "local", verified: false };

    const evalAfter: EvalResult = afterAnalysis
      ? positionAnalysisToEvalResult(afterAnalysis, 0)
      : { cp: 0, depth: 0, source: "local", verified: false };

    const cpWhiteBefore = beforeAnalysis
      ? lineCpWhite(beforeAnalysis.lines[0] ?? {})
      : 0;
    const cpWhiteAfter = afterAnalysis
      ? lineCpWhite(afterAnalysis.lines[0] ?? {})
      : 0;

    const eBefore = expectedPointsFromEval(
      { cp: cpWhiteBefore, mate: beforeAnalysis?.lines[0]?.mate },
      mover
    );
    const eAfterPlayed = expectedPointsFromEval(
      { cp: cpWhiteAfter, mate: afterAnalysis?.lines[0]?.mate },
      mover
    );

    const bestUci =
      beforeAnalysis?.lines[0]?.bestMove ?? beforeAnalysis?.lines[0]?.pv[0];
    let fenAfterBest: string | null = null;
    let eAfterBest = eBefore;

    if (bestUci) {
      fenAfterBest = applyUci(fenBefore, bestUci);
      if (fenAfterBest) {
        let bestAnalysis = analysisCache.get(fenAfterBest);
        if (!bestAnalysis) {
          bestAnalysis = await analyzePositionMultiPv(fenAfterBest, { depth, multiPv });
          analysisCache.set(fenAfterBest, bestAnalysis);
          report();
        }
        const cpBest = lineCpWhite(bestAnalysis.lines[0] ?? {});
        eAfterBest = expectedPointsFromEval(
          { cp: cpBest, mate: bestAnalysis.lines[0]?.mate },
          mover
        );
      }
    }

    const playerUci = (move.from + move.to + (move.promotion ?? "")).toLowerCase();
    const epLoss = epLossFromPlayed({
      fenBefore,
      fenAfter,
      fenAfterBest,
      mover,
      playedUci: playerUci,
      eBefore,
      eAfterPlayed,
      eAfterBest,
      multipvLines: beforeAnalysis?.lines ?? [],
      opponentPriorClass: priorClass,
      opponentPriorEpLoss: priorEpLoss,
    });

    const classifyInput: ClassifyReviewInput = {
      fenBefore,
      fenAfter,
      fenAfterBest,
      mover,
      playedUci: playerUci,
      eBefore,
      eAfterPlayed,
      eAfterBest,
      multipvLines: beforeAnalysis?.lines ?? [],
      openingBook: options.openingBook,
      opponentPriorClass: priorClass,
      opponentPriorEpLoss: priorEpLoss,
    };

    const inBook =
      checkOpeningBookSync(fenBefore, options.openingBook) ||
      (!bookEnded && i < 16 && epLoss <= 0.1);

    const classification: MoveClassification =
      beforeAnalysis && beforeAnalysis.lines.length > 0
        ? inBook && !bookEnded
          ? "book"
          : classifyReviewMove(classifyInput)
        : null;

    if (classification !== "book" && classification !== null) bookEnded = true;

    const cpBeforeMover = cpForMover(cpWhiteBefore, mover);
    const cpAfterMover = cpForMover(cpWhiteAfter, mover);
    const cpBestMover = cpForMover(
      fenAfterBest && analysisCache.get(fenAfterBest)
        ? lineCpWhite(analysisCache.get(fenAfterBest)!.lines[0] ?? {})
        : cpWhiteBefore,
      mover
    );

    let bestMoveSan: string | undefined;
    let pvLine: string[] | undefined;
    if (bestUci) {
      try {
        const tc = new Chess(fenBefore);
        const bm = tc.move({
          from: bestUci.slice(0, 2),
          to: bestUci.slice(2, 4),
          promotion: bestUci[4] as "q" | "r" | "b" | "n" | undefined,
        });
        if (bm) {
          bestMoveSan = bm.san;
          pvLine = [];
          for (const uci of (beforeAnalysis?.lines[0]?.pv ?? []).slice(1, 6)) {
            try {
              const m = tc.move({
                from: uci.slice(0, 2),
                to: uci.slice(2, 4),
                promotion: uci[4] as "q" | "r" | "b" | "n" | undefined,
              });
              if (m) pvLine.push(m.san);
              else break;
            } catch {
              break;
            }
          }
        }
      } catch {
        /* ignore */
      }
    }

    const verified = (beforeAnalysis?.depth ?? 0) >= MIN_DEPTH;

    moves.push({
      moveNumber: Math.floor(i / 2) + 1,
      color: mover,
      san: move.san,
      uci: move.from + move.to + (move.promotion ?? ""),
      fenBefore,
      fenAfter,
      evalBefore,
      evalAfter,
      eBest: cpBestMover / 100,
      eActual: cpAfterMover / 100,
      deltaE: (cpBeforeMover - cpAfterMover) / 100,
      epLoss,
      classification,
      inOpeningBook: classification === "book",
      isSacrifice: detectPieceSacrifice(fenBefore, fenAfter, beforeAnalysis?.lines[0]?.pv),
      bestMove: bestUci,
      bestMoveSan,
      pvLine,
      verified,
      confidence: verified ? 0.95 : 0.4,
      unverifiedReason: verified ? undefined : "shallow_depth",
      reviewRunId: runId,
    });

    priorClass = classification;
    priorEpLoss = epLoss;
    report();
  }

  const run: ReviewRun = {
    runId,
    engineVersion: "stockfish-wasm-multipv-v3",
    startedAt,
    finishedAt: nowIso(),
    requestedDepth: depth,
    fastDepth: depth,
    deepDepth: depth,
    backendPolicy: "consensus",
    pgnHash: hashText(pgn),
  };

  return {
    run,
    moves,
    summary: buildSummary(moves),
  };
}

export { analyzeGameReview as analyzePgnChessCom };

import { Chess, type Move } from "chess.js";
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
import { computePhaseAccuracies } from "./gamePhases";
import {
  classifyReviewMove,
  engineRankFromMultipv,
  accuracyEpLoss,
  type ClassifyReviewInput,
} from "./classifyReviewMove";
import { expectedPointsFromEval, expectedPointsFromLine } from "./expectedPoints";
import { checkOpeningBookSync } from "./openingBook";
import {
  analyzePositionMultiPv,
  lineCpWhite,
  positionAnalysisToEvalResult,
} from "./stockfishClient";
import { DEFAULT_PLAYER_RATING } from "./ratingThresholds";
import {
  batchCacheIsUsable,
  buildBatchPositionCache,
  fillMissingWithWasm,
} from "./evalCache";
import type { PositionAnalysis, ReviewEngineOptions } from "./types";
import { detectPieceSacrifice } from "./detectPieceSacrifice";
import { isDeliveredCheckmate } from "./mateDetection";

const DEFAULT_DEPTH = 16;
const WASM_FALLBACK_MIN_DEPTH = 14;
const DEFAULT_MULTIPV = 3;

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
    miss: 0,
    blunder: 0,
  };
}

function cpForMover(cpWhite: number, mover: "w" | "b"): number {
  return mover === "w" ? cpWhite : -cpWhite;
}

function buildSummary(moves: AnalyzedMove[], formulaVersion: string): ReviewSummary {
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
    phaseAccuracy: computePhaseAccuracies(moves),
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
      method: "lichess_caps2_v5",
      formulaVersion: `v3.3.0-${formulaVersion}`,
    },
  };
}

export interface GameReviewOptions extends ReviewEngineOptions {
  onProgress?: (done: number, total: number) => void;
  openingBook?: ReadonlySet<string>;
  whiteRating?: number | null;
  blackRating?: number | null;
}

async function buildAnalysisCache(
  fens: string[],
  depth: number,
  multiPv: number,
  onProgress?: (done: number, total: number) => void
): Promise<{ cache: Map<string, PositionAnalysis>; engineTag: string }> {
  const unique = [...new Set(fens)];
  const batch = await buildBatchPositionCache(unique, depth, (done, total) => {
    onProgress?.(Math.round((done / Math.max(total, 1)) * 88), 100);
  });
  if (batchCacheIsUsable(batch, unique)) {
    onProgress?.(90, 100);
    return { cache: batch, engineTag: "v3.2-wdl-full-depth" };
  }

  // Native incomplete: fill ONLY missing FENs (never re-run the whole game in WASM).
  const wasmDepth = Math.max(WASM_FALLBACK_MIN_DEPTH, depth);
  await fillMissingWithWasm(
    batch,
    unique,
    wasmDepth,
    multiPv,
    analyzePositionMultiPv,
    (done, total) => {
      onProgress?.(88 + Math.round((done / Math.max(total, 1)) * 2), 100);
    }
  );
  onProgress?.(90, 100);
  const tag = batchCacheIsUsable(batch, unique)
    ? "v3.2-wdl-full-depth-wasm-fill"
    : "v3.2-wdl-partial";
  return { cache: batch, engineTag: tag };
}

function collectExtraBestFens(
  fens: string[],
  history: Move[],
  cache: Map<string, PositionAnalysis>
): string[] {
  const extra: string[] = [];
  for (let i = 0; i < history.length; i++) {
    const fenBefore = fens[i];
    const before = cache.get(fenBefore);
    const bestUci = before?.lines[0]?.bestMove ?? before?.lines[0]?.pv[0];
    if (!bestUci) continue;
    const played = (
      history[i].from +
      history[i].to +
      (history[i].promotion ?? "")
    ).toLowerCase();
    if (bestUci.toLowerCase() === played) continue;
    const fenBest = applyUci(fenBefore, bestUci);
    if (fenBest && !cache.has(fenBest)) extra.push(fenBest);
  }
  return extra;
}

/**
 * Full-depth review: every position evaluated once at the requested depth.
 */
export async function analyzeGameReview(
  pgn: string,
  options: GameReviewOptions = {}
): Promise<ReviewResult> {
  const startedAt = nowIso();
  const runId = `${Date.now().toString(36)}-${hashText(pgn).slice(0, 8)}`;
  const depth = Math.max(options.minDepth ?? DEFAULT_DEPTH, options.depth ?? DEFAULT_DEPTH);
  const multiPv = options.multiPv ?? DEFAULT_MULTIPV;

  const chess = new Chess();
  chess.loadPgn(pgn);
  const history = chess.history({ verbose: true }) as Move[];

  const fens: string[] = [];
  const tmp = new Chess();
  fens.push(tmp.fen());
  for (const m of history) {
    tmp.move(m.san);
    fens.push(tmp.fen());
  }

  const { cache: analysisCache, engineTag } = await buildAnalysisCache(
    [...new Set(fens)],
    depth,
    multiPv,
    options.onProgress
  );

  const extraBestFens = collectExtraBestFens(fens, history, analysisCache);
  if (extraBestFens.length > 0) {
    const extra = await buildBatchPositionCache(extraBestFens, depth, (d, t) => {
      options.onProgress?.(88 + Math.round((d / Math.max(t, 1)) * 6), 100);
    });
    for (const [fen, a] of extra) analysisCache.set(fen, a);
  } else {
    options.onProgress?.(94, 100);
  }

  options.onProgress?.(98, 100);

  const moves: AnalyzedMove[] = [];
  let priorClass: MoveClassification | null = null;
  let priorEpLoss = 0;
  let bookEnded = false;
  const lastEpByColor: Record<"w" | "b", number> = { w: 0.5, b: 0.5 };

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

    let evalAfter: EvalResult = afterAnalysis
      ? positionAnalysisToEvalResult(afterAnalysis, 0)
      : { cp: 0, depth: 0, source: "local", verified: false };

    const cpWhiteBefore = beforeAnalysis
      ? lineCpWhite(beforeAnalysis.lines[0] ?? {})
      : 0;
    const cpWhiteAfter = afterAnalysis
      ? lineCpWhite(afterAnalysis.lines[0] ?? {})
      : 0;

    const lineBefore = beforeAnalysis?.lines[0];
    const lineAfter = afterAnalysis?.lines[0];

    const deliveredMate = isDeliveredCheckmate(fenAfter);
    if (deliveredMate) {
      evalAfter = {
        ...evalAfter,
        cp: undefined,
        mate: mover === "w" ? 1 : -1,
      };
    }

    const eBefore = expectedPointsFromEval(
      {
        cp: cpWhiteBefore,
        mate: lineBefore?.mate,
        wdl: lineBefore?.wdl,
      },
      mover
    );
    const eAfterPlayed = expectedPointsFromEval(
      {
        cp: cpWhiteAfter,
        mate: lineAfter?.mate,
        wdl: lineAfter?.wdl,
      },
      mover,
      { afterDeliveredCheckmate: deliveredMate }
    );

    const bestUci =
      beforeAnalysis?.lines[0]?.bestMove ?? beforeAnalysis?.lines[0]?.pv[0];
    let fenAfterBest: string | null = null;
    let eAfterBest = eBefore;

    if (bestUci) {
      fenAfterBest = applyUci(fenBefore, bestUci);
      const bestAnalysis = fenAfterBest ? analysisCache.get(fenAfterBest) : undefined;
      if (bestAnalysis?.lines[0]) {
        const bestLine = bestAnalysis.lines[0];
        eAfterBest = expectedPointsFromLine(bestLine, mover, fenAfterBest ?? undefined);
      }
    }

    let forced = false;
    try {
      forced = new Chess(fenBefore).moves().length === 1;
    } catch {
      forced = false;
    }

    const playerRating =
      mover === "w"
        ? options.whiteRating ?? DEFAULT_PLAYER_RATING
        : options.blackRating ?? DEFAULT_PLAYER_RATING;

    const playerUci = (move.from + move.to + (move.promotion ?? "")).toLowerCase();

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
      epBeforeOpponentMove: lastEpByColor[mover],
      postOpponentEP: eBefore,
      playerRating,
      forced,
    };

    let epLoss = accuracyEpLoss(classifyInput);
    if (deliveredMate) {
      classifyInput.eAfterPlayed = 1;
      classifyInput.eAfterBest = 1;
      classifyInput.eBefore = 1;
      epLoss = 0;
    }

    const inBook = checkOpeningBookSync(fenBefore, options.openingBook);

    const classification: MoveClassification = deliveredMate
      ? "best"
      : beforeAnalysis && beforeAnalysis.lines.length > 0
        ? inBook && !bookEnded
          ? "book"
          : classifyReviewMove(classifyInput)
        : null;

    if (classification !== "book" && classification !== null) bookEnded = true;

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

    const verified = (beforeAnalysis?.depth ?? 0) >= depth;
    const multipvLines = beforeAnalysis?.lines ?? [];
    const engineRank =
      classification === "book" || forced
        ? undefined
        : engineRankFromMultipv(multipvLines, playerUci);

    moves.push({
      moveNumber: Math.floor(i / 2) + 1,
      color: mover,
      san: move.san,
      uci: move.from + move.to + (move.promotion ?? ""),
      fenBefore,
      fenAfter,
      evalBefore,
      evalAfter,
      eBefore,
      eBest: eAfterBest,
      eActual: deliveredMate ? 1 : eAfterPlayed,
      deltaE: deliveredMate ? 0 : epLoss,
      epLoss,
      classification,
      inOpeningBook: classification === "book",
      forced,
      isSacrifice: detectPieceSacrifice(fenBefore, fenAfter, beforeAnalysis?.lines[0]?.pv),
      bestMove: bestUci,
      bestMoveSan,
      engineRank,
      engineLineCount: multipvLines.length > 0 ? multipvLines.length : undefined,
      pvLine,
      verified,
      confidence: verified ? 0.95 : 0.4,
      unverifiedReason: verified ? undefined : "shallow_depth",
      reviewRunId: runId,
    });

    priorClass = classification;
    priorEpLoss = epLoss;
    lastEpByColor[mover] = deliveredMate ? 1 : eAfterPlayed;

    if (history.length > 0 && (i + 1) % 4 === 0) {
      const classifyPct = 98 + Math.round(((i + 1) / history.length) * 1.5);
      options.onProgress?.(Math.min(99, classifyPct), 100);
    }
  }

  options.onProgress?.(100, 100);

  const run: ReviewRun = {
    runId,
    engineVersion: `stockfish-${engineTag}`,
    startedAt,
    finishedAt: nowIso(),
    requestedDepth: depth,
    fastDepth: depth,
    deepDepth: depth,
    backendPolicy: "full-depth",
    pgnHash: hashText(pgn),
  };

  return {
    run,
    moves,
    summary: buildSummary(moves, engineTag),
  };
}


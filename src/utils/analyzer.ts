import { Chess, type Move as ChessMove } from "chess.js";
import { evaluateFen, evaluateFensBatch } from "../engine/evaluationService";
import {
  computePlayerAccuracy,
  expectedPointsLost,
  winPercentFromCp,
} from "./accuracy";
import {
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
  EvalResult,
  MoveClassification,
  ReviewSummary,
  ClassificationCounts,
  KeyMoment,
} from "../types";

// Lichess win% + Chess.com expected-points bands
// https://lichess.org/page/accuracy
// https://support.chess.com/en/articles/8572705

function winningChances(cp: number): number {
  const clamped = Math.max(-1000, Math.min(1000, cp));
  return 2 / (1 + Math.exp(-0.00368208 * clamped)) - 1;
}

function winPercent(cp: number): number {
  return winPercentFromCp(cp);
}

function evalToCp(e: EvalResult): number {
  if (e.mate !== undefined) return e.mate > 0 ? 10000 : -10000;
  return e.cp ?? 0;
}

function isUsableEval(e: EvalResult | undefined): e is EvalResult {
  return (
    !!e &&
    e.depth > 0 &&
    (e.cp !== undefined || e.mate !== undefined)
  );
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

export async function analyzePgn(
  pgn: string,
  onProgress?: (done: number, total: number) => void,
  depth = 16
): Promise<{ moves: AnalyzedMove[]; summary: ReviewSummary }> {
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

  const uniqueFens = new Set<string>(fensList);
  const evalCache = new Map<string, EvalResult>();
  const emptyEval = (): EvalResult => ({ cp: undefined, depth: 0, source: "local" });

  const positionTotal = fensList.length;
  let done = 0;

  const fillFromBatch = (
    batch: Map<string, EvalResult>,
    fens: string[],
    discoverBest = false
  ) => {
    for (const fen of fens) {
      const result = batch.get(fen) ?? emptyEval();
      evalCache.set(fen, result);
      if (discoverBest && result.bestMove) {
        const fenBest = applyUci(fen, result.bestMove);
        if (fenBest) uniqueFens.add(fenBest);
      }
    }
  };

  // Native laptop server: batch HTTP (few round-trips, depth 16, server-side cache)
  const pass1Batch = await evaluateFensBatch(fensList, depth, (d, t) => {
    onProgress?.(d, t);
  });

  const evalMissing = async (fens: string[]) => {
    for (const fen of fens) {
      if (isUsableEval(evalCache.get(fen))) continue;
      const result = await evaluateFen(fen, depth).catch(emptyEval);
      evalCache.set(fen, result);
    }
  };

  if (pass1Batch.size > 0) {
    fillFromBatch(pass1Batch, fensList, true);
    await evalMissing(fensList.filter((f) => !isUsableEval(evalCache.get(f))));
    done = fensList.length;
    onProgress?.(done, positionTotal);

    const extraFens = [...uniqueFens].filter((f) => !evalCache.has(f));
    const evalTotal = positionTotal + extraFens.length;
    if (extraFens.length > 0) {
      const pass2Batch = await evaluateFensBatch(extraFens, depth, (d) => {
        onProgress?.(positionTotal + d, evalTotal);
      });
      fillFromBatch(pass2Batch, extraFens);
      await evalMissing(extraFens.filter((f) => !isUsableEval(evalCache.get(f))));
      done = evalTotal;
      onProgress?.(done, evalTotal);
    }
  } else {
    // Fallback: Lichess / browser worker (one FEN at a time)
    for (const fen of fensList) {
      const result = await evaluateFen(fen, depth).catch(emptyEval);
      evalCache.set(fen, result);
      if (result.bestMove) {
        const fenBest = applyUci(fen, result.bestMove);
        if (fenBest) uniqueFens.add(fenBest);
      }
      done++;
      onProgress?.(done, positionTotal);
    }

    const extraFens = [...uniqueFens].filter((f) => !evalCache.has(f));
    const evalTotal = positionTotal + extraFens.length;
    for (const fen of extraFens) {
      const result = await evaluateFen(fen, depth).catch(emptyEval);
      evalCache.set(fen, result);
      done++;
      onProgress?.(done, evalTotal);
    }
  }

  // Strict map: only real engine/cloud evals (no stale carry-forward)
  const strictCp = new Map<string, number>();
  for (const fen of [...uniqueFens]) {
    const e = evalCache.get(fen);
    if (isUsableEval(e)) strictCp.set(fen, evalToCp(e));
  }

  // Chart map: carry forward so the eval graph stays readable when Lichess 404s
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

    const evalBefore = evalCache.get(fenBefore) ?? {
      cp: 0,
      depth: 0,
      source: "local" as const,
    };
    const evalAfter = evalCache.get(fenAfter) ?? {
      cp: 0,
      depth: 0,
      source: "local" as const,
    };

    const sign = move.color === "w" ? 1 : -1;
    const cpBefore = sign * (strictCp.get(fenBefore) ?? 0);
    const cpAfter = sign * (strictCp.get(fenAfter) ?? 0);

    const clamp = (v: number) => Math.max(-1500, Math.min(1500, v));
    const cpBeforeClamped = clamp(cpBefore);
    const cpAfterClamped = clamp(cpAfter);

    const wpBeforePct = winPercent(cpBeforeClamped);
    const wpAfterActualPct = winPercent(cpAfterClamped);

    const bestMoveUci = evalBefore?.bestMove;
    let cpAfterBest = cpBeforeClamped;
    let fenBest: string | null = null;
    if (bestMoveUci) {
      fenBest = applyUci(fenBefore, bestMoveUci);
      if (fenBest && strictCp.has(fenBest)) {
        cpAfterBest = sign * strictCp.get(fenBest)!;
      }
    }

    const epLoss = expectedPointsLost(cpAfterBest, cpAfterClamped);

    const clampClass = (v: number) => Math.max(-600, Math.min(600, v));
    const deltaCP = clampClass(cpBefore) - clampClass(cpAfter);

    const hasBestLineEval =
      !bestMoveUci || (fenBest !== null && strictCp.has(fenBest));
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
      winPercent
    );

    const couldBeBook = bothEvaluated
      ? couldBeBookMove(
          i,
          bookEnded,
          epLoss,
          Math.abs(cpBeforeClamped),
          isTop
        )
      : false;

    const moveUci = playerUci;
    const exchangeBal = exchangeBalanceAfterMove(fenBefore, moveUci, move.color);
    const isSacrifice = detectVoluntarySacrifice(
      fenBefore,
      moveUci,
      move.color,
      history,
      i
    );
    const brilliantSac = qualifiesForBrilliant(
      fenBefore,
      moveUci,
      move.color,
      history,
      i,
      exchangeBal
    );

    const hasMateScore =
      evalBefore.mate !== undefined || evalAfter.mate !== undefined;

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
          for (const uciMove of (evalBefore?.pv ?? []).slice(1, 6)) {
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
        /* ignore */
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
      eBest: cpBeforeClamped,
      eActual: cpAfterClamped,
      deltaE: deltaCP / 100,
      epLoss,
      classification,
      isSacrifice,
      bestMove: bestMoveUci,
      bestMoveSan,
      pvLine,
    });
  }

  return { moves, summary: buildSummary(moves, chartCpWhite) };
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

function buildSummary(
  moves: AnalyzedMove[],
  resolvedCpWhite: Map<string, number>
): ReviewSummary {
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
      if (c in counts) (counts as unknown as Record<string, number>)[c]++;
    }

    const swing = Math.abs(m.deltaE);
    if (swing >= 1.0 || c === "brilliant" || c === "great" || c === "blunder") {
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

  const phaseForMove = (m: AnalyzedMove, idx: number) =>
    detectPhase(m.fenBefore, stillInBookAt[idx] ?? false, idx);

  const whiteAcc = computePlayerAccuracy(
    moves,
    "w",
    resolvedCpWhite,
    phaseForMove
  );
  const blackAcc = computePlayerAccuracy(
    moves,
    "b",
    resolvedCpWhite,
    phaseForMove
  );

  return {
    white,
    black,
    accuracy: {
      white: whiteAcc.game,
      black: blackAcc.game,
    },
    phaseAccuracy: {
      opening: {
        white: whiteAcc.phase.opening,
        black: blackAcc.phase.opening,
      },
      middlegame: {
        white: whiteAcc.phase.middlegame,
        black: blackAcc.phase.middlegame,
      },
      endgame: {
        white: whiteAcc.phase.endgame,
        black: blackAcc.phase.endgame,
      },
    },
    keyMoments,
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

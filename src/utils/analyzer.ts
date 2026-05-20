import { Chess } from "chess.js";
import { evaluateFen } from "../engine/evaluationService";
import {
  computePlayerAccuracy,
  expectedPointsLost,
  winPercentFromCp,
} from "./accuracy";
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

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

function materialCount(chess: Chess, color: "w" | "b"): number {
  let total = 0;
  for (const row of chess.board()) {
    for (const p of row) {
      if (p && p.color === color) total += PIECE_VALUES[p.type] ?? 0;
    }
  }
  return total;
}

/**
 * True only when the player gives up material on purpose (engine-approved brilliant).
 * Ignores equal trades (Bxb3 axb3), profitable captures, and "hanging" after a fair exchange.
 */
function detectSacrifice(fenBefore: string, uci: string, color: "w" | "b"): boolean {
  const from = uci.slice(0, 2) as Parameters<Chess["get"]>[0];
  const to = uci.slice(2, 4) as Parameters<Chess["get"]>[0];
  const chess = new Chess(fenBefore);
  const piece = chess.get(from);
  if (!piece || piece.type === "p" || piece.type === "k") return false;

  const movingVal = PIECE_VALUES[piece.type] ?? 0;
  const capturedBefore = chess.get(to);
  const capturedVal = capturedBefore ? PIECE_VALUES[capturedBefore.type] ?? 0 : 0;

  // Winning or equal capture (e.g. Bxb3 taking a bishop) is never a sacrifice
  if (capturedBefore && capturedVal >= movingVal) return false;

  try {
    const matBefore = materialCount(chess, color);
    const tmp = new Chess(fenBefore);
    const result = tmp.move({
      from,
      to,
      promotion: uci[4] as "q" | "r" | "b" | "n" | undefined,
    });
    if (!result) return false;

    // If opponent can recapture on the square, assume the cheapest recapture
    const recaptures = tmp
      .moves({ verbose: true })
      .filter((m) => m.to === to && m.captured);
    if (recaptures.length > 0) {
      const recapture = recaptures.reduce((a, b) =>
        (PIECE_VALUES[a.piece] ?? 9) <= (PIECE_VALUES[b.piece] ?? 9) ? a : b
      );
      tmp.move({
        from: recapture.from,
        to: recapture.to,
        promotion: recapture.promotion,
      });
      const matAfterLine = materialCount(tmp, color);
      // Need at least a pawn of net material lost (filters B-for-B, N-for-N trades)
      return matAfterLine <= matBefore - 2;
    }

    // Non-capture: piece left en prise with no immediate recapture
    if (!result.captured) {
      const attackers = tmp.moves({ verbose: true }).filter((m) => m.to === to);
      if (attackers.length === 0) return false;
      const matAfter = materialCount(tmp, color);
      return matAfter <= matBefore - 2;
    }

    // Capture with no recapture — only sacrifice if we didn't profit
    const matAfter = materialCount(tmp, color);
    const gained = result.captured ? PIECE_VALUES[result.captured] ?? 0 : 0;
    return gained < movingVal && matAfter <= matBefore - 2;
  } catch {
    return false;
  }
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

function classifyMove(
  epLoss: number,
  isBook: boolean,
  isSacrifice: boolean,
  wpBeforePct: number,
  wpAfterActualPct: number,
  isPlayerBestMove: boolean,
  prevWpForMoverPct: number
): MoveClassification {
  if (isBook) return "book";

  const wpBefore = wpBeforePct / 100;
  const wpAfter = wpAfterActualPct / 100;

  // Brilliant: real material sacrifice + engine top choice (Chess.com-style)
  if (
    isSacrifice &&
    isPlayerBestMove &&
    epLoss <= 0.02 &&
    wpBefore > 0.15 &&
    wpBefore < 0.85 &&
    wpAfter >= 0.4 &&
    wpAfter <= wpBefore + 0.05
  ) {
    return "brilliant";
  }

  if (epLoss <= 0.02) {
    const savedGame = wpBefore < 0.25 && wpAfter >= 0.4;
    const capitalizesBlunder =
      prevWpForMoverPct / 100 <= 0.45 &&
      wpBefore >= 0.7 &&
      wpAfter >= 0.65 &&
      isPlayerBestMove;
    if (savedGame || capitalizesBlunder) return "great";
  }

  if (isPlayerBestMove || epLoss < 0.005) return "best";
  if (epLoss <= 0.02) return "excellent";
  if (epLoss <= 0.05) return "good";
  if (epLoss <= 0.1) return "inaccuracy";
  if (epLoss <= 0.2) return "mistake";
  return "blunder";
}

const BOOK_HALF_MOVES = 14;

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

  // Pass 1: evaluate every position in the game (also discovers best-move FENs)
  const positionTotal = fensList.length;
  let done = 0;
  for (const fen of fensList) {
    const result = await evaluateFen(fen, depth).catch(
      (): EvalResult => ({ cp: undefined, depth: 0, source: "local" })
    );
    evalCache.set(fen, result);
    if (result.bestMove) {
      const fenBest = applyUci(fen, result.bestMove);
      if (fenBest) uniqueFens.add(fenBest);
    }
    done++;
    onProgress?.(done, positionTotal);
  }

  // Pass 2: evaluate FENs after engine best moves (for expected-points loss)
  const extraFens = [...uniqueFens].filter((f) => !evalCache.has(f));
  const evalTotal = positionTotal + extraFens.length;
  for (const fen of extraFens) {
    const result = await evaluateFen(fen, depth).catch(
      (): EvalResult => ({ cp: undefined, depth: 0, source: "local" })
    );
    evalCache.set(fen, result);
    done++;
    onProgress?.(done, evalTotal);
  }

  // Strict map: only real engine/cloud evals (no stale carry-forward)
  const strictCp = new Map<string, number>();
  for (const fen of [...fensList, ...extraFens]) {
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
    const bothEvaluated =
      strictCp.has(fenBefore) &&
      strictCp.has(fenAfter) &&
      hasBestLineEval &&
      isUsableEval(evalBefore) &&
      isUsableEval(evalAfter);

    const couldBeBook =
      !bookEnded && bothEvaluated && i < BOOK_HALF_MOVES && epLoss < 0.01;

    const isRecapture =
      i > 0 && history[i - 1].captured && history[i - 1].to === move.to;
    const isSacrifice =
      !isRecapture &&
      detectSacrifice(fenBefore, move.from + move.to, move.color);

    const playerUci = (move.from + move.to + (move.promotion ?? "")).toLowerCase();
    const isPlayerBestMove =
      !!bestMoveUci && playerUci === bestMoveUci.toLowerCase();

    let prevWpForMoverPct = 50;
    if (i >= 2) {
      const cpWhitePrev = chartCpWhite.get(fensList[i - 1]) ?? 0;
      prevWpForMoverPct = winPercent(clamp(sign * cpWhitePrev));
    }

    const classification: MoveClassification = bothEvaluated
      ? classifyMove(
          epLoss,
          couldBeBook,
          isSacrifice,
          wpBeforePct,
          wpAfterActualPct,
          isPlayerBestMove,
          prevWpForMoverPct
        )
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

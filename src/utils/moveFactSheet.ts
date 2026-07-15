import { Chess } from "chess.js";
import { isDeliveredCheckmate } from "../analysis/mateDetection";
import type { AnalyzedMove } from "../types";
import { getMeta } from "./classificationMeta";
import {
  formatWinChanceDelta,
  moverWinChanceDeltaPercent,
} from "./evalDisplay";
import {
  computeOpeningChapter,
  isLeftBookMove,
  openingHintForMove,
} from "./openingContext";
import type { OpeningEcoEntry } from "./openingEcoLookup";

export interface MoveFactSheet {
  classification: string;
  classificationColor: string;
  engineRank: string;
  bestWas: string;
  winChange: string;
  opening: string;
  played: string;
}

export interface MoveFactSheetOptions {
  openingHint?: string;
  moveIdx?: number;
  moves?: AnalyzedMove[];
  ecoEntries?: OpeningEcoEntry[] | null;
}

const EMPTY = "—";

function normalizeSan(san: string): string {
  return san.replace(/[+#]/g, "");
}

function playedMatchesBest(move: AnalyzedMove): boolean {
  if (!move.bestMove || move.bestMove.length < 4) return false;
  if (move.uci.toLowerCase() === move.bestMove.toLowerCase()) return true;
  if (
    move.bestMoveSan &&
    normalizeSan(move.bestMoveSan) === normalizeSan(move.san)
  ) {
    return true;
  }
  return false;
}

function engineRankLabel(move: AnalyzedMove): string {
  const lineCount = move.engineLineCount;
  const isBest =
    move.engineRank === 1 || playedMatchesBest(move);

  // Single-PV / unknown MultiPV — never invent a "top 3" claim.
  if (lineCount == null || lineCount <= 1) {
    return isBest ? "Engine best" : "Not engine best";
  }

  if (move.engineRank != null && move.engineRank > 0) {
    if (move.engineRank === 1) return `1st of ${lineCount}`;
    if (move.engineRank === 2) return `2nd of ${lineCount}`;
    if (move.engineRank === 3) return `3rd of ${lineCount}`;
    return `${move.engineRank}th of ${lineCount}`;
  }
  if (isBest) return `1st of ${lineCount}`;
  return `Outside top ${lineCount}`;
}

function bestMoveSanFromMove(move: AnalyzedMove): string | null {
  if (move.bestMoveSan) return move.bestMoveSan;
  if (!move.bestMove || move.bestMove.length < 4 || !move.fenBefore) return null;
  try {
    const chess = new Chess(move.fenBefore);
    const m = chess.move({
      from: move.bestMove.slice(0, 2),
      to: move.bestMove.slice(2, 4),
      promotion: move.bestMove[4] as "q" | "r" | "b" | "n" | undefined,
    });
    return m?.san ?? null;
  } catch {
    return null;
  }
}

function bestWasLabel(move: AnalyzedMove): string {
  const san = bestMoveSanFromMove(move);
  if (!san) return EMPTY;
  if (playedMatchesBest(move)) return EMPTY;
  return san;
}

/** True when the coach fact sheet would show a Best was row. */
export function coachShowsBestWas(move: AnalyzedMove | null | undefined): boolean {
  if (!move?.classification) return false;
  if (move.classification === "book" || move.inOpeningBook || move.forced) return false;
  if (isDeliveredCheckmate(move.fenAfter)) return false;
  return bestWasLabel(move) !== EMPTY;
}

function winChangeLabel(move: AnalyzedMove): string {
  return formatWinChanceDelta(moverWinChanceDeltaPercent(move));
}

function openingLabel(
  move: AnalyzedMove,
  options: MoveFactSheetOptions
): string {
  const moveIdx = options.moveIdx ?? 0;
  const moves = options.moves;
  const hint =
    options.openingHint ??
    (moves
      ? openingHintForMove(moveIdx, moves, options.ecoEntries)
      : undefined);
  const chapter = moves ? computeOpeningChapter(moves) : null;

  if (moves && isLeftBookMove(moveIdx, moves)) {
    return chapter?.openingName
      ? `Left theory (${chapter.openingName})`
      : "Left theory";
  }
  if (move.classification === "book" || move.inOpeningBook) {
    if (hint) return hint;
    if (chapter?.openingName) return chapter.openingName;
    return "In theory";
  }
  if (chapter?.openingName && moveIdx <= (chapter.endIdx ?? -1)) {
    return chapter.openingName;
  }
  return EMPTY;
}

export function buildMoveFactSheet(
  move: AnalyzedMove,
  options: MoveFactSheetOptions = {}
): MoveFactSheet | null {
  const c = move.classification;
  if (!c) return null;

  const meta = getMeta(c);
  const classification = meta?.label ?? c;
  const classificationColor = meta?.color ?? "#6daa6d";

  if (isDeliveredCheckmate(move.fenAfter)) {
    return {
      classification: "Checkmate",
      classificationColor: "#e84855",
      engineRank: EMPTY,
      bestWas: EMPTY,
      winChange: winChangeLabel(move),
      opening: openingLabel(move, options),
      played: move.san,
    };
  }

  if (move.forced) {
    return {
      classification: "Forced",
      classificationColor,
      engineRank: EMPTY,
      bestWas: EMPTY,
      winChange: winChangeLabel(move),
      opening: openingLabel(move, options),
      played: move.san,
    };
  }

  if (c === "book") {
    return {
      classification,
      classificationColor,
      engineRank: EMPTY,
      bestWas: EMPTY,
      winChange: winChangeLabel(move),
      opening: openingLabel(move, options),
      played: move.san,
    };
  }

  return {
    classification,
    classificationColor,
    engineRank: engineRankLabel(move),
    bestWas: bestWasLabel(move),
    winChange: winChangeLabel(move),
    opening: openingLabel(move, options),
    played: move.san,
  };
}

/** Legacy string helper — used by tests and fallback exports. */
export function buildFactualMoveComment(
  move: AnalyzedMove,
  options: MoveFactSheetOptions = {}
): string | null {
  const sheet = buildMoveFactSheet(move, options);
  if (!sheet) return null;
  return [
    sheet.classification,
    `Played ${sheet.played}`,
    sheet.bestWas !== EMPTY ? `Best: ${sheet.bestWas}` : null,
    `Win ${sheet.winChange}`,
  ]
    .filter(Boolean)
    .join(". ")
    .replace(/\.\./g, ".");
}

import { isDeliveredCheckmate } from "../analysis/mateDetection";
import type { AnalyzedMove } from "../types";
import { getMeta } from "./classificationMeta";
import {
  formatWinChanceLossShort,
  winChanceLossPercent,
} from "./evalDisplay";
import {
  computeOpeningChapter,
  isLeftBookMove,
  openingHintForMove,
} from "./openingContext";

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
  const n = lineCount && lineCount > 1 ? lineCount : 3;

  if (move.engineRank != null && move.engineRank > 0) {
    if (move.engineRank === 1) return `1st of ${n}`;
    if (move.engineRank === 2) return `2nd of ${n}`;
    if (move.engineRank === 3) return `3rd of ${n}`;
    return `${move.engineRank}th of ${n}`;
  }
  if (playedMatchesBest(move)) return `1st of ${n}`;
  if (lineCount != null && lineCount <= 1) return "Not engine best";
  if (lineCount && lineCount > 0) return `Outside top ${lineCount}`;
  return `Outside top ${n}`;
}

function bestWasLabel(move: AnalyzedMove): string {
  if (!move.bestMoveSan) return EMPTY;
  if (playedMatchesBest(move)) return "Same as played";
  return move.bestMoveSan;
}

function winChangeLabel(move: AnalyzedMove): string {
  const pct = winChanceLossPercent(move.deltaE);
  if (pct < 1) return "0%";
  return formatWinChanceLossShort(move.deltaE);
}

function openingLabel(
  move: AnalyzedMove,
  options: MoveFactSheetOptions
): string {
  const moveIdx = options.moveIdx ?? 0;
  const moves = options.moves;
  const hint =
    options.openingHint ??
    (moves ? openingHintForMove(moveIdx, moves) : undefined);
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
      winChange: "0%",
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
      winChange: "0%",
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
    sheet.engineRank !== EMPTY ? `Rank: ${sheet.engineRank}` : null,
    `Played ${sheet.played}`,
    sheet.bestWas !== EMPTY ? `Best: ${sheet.bestWas}` : null,
    `Win ${sheet.winChange}`,
  ]
    .filter(Boolean)
    .join(". ")
    .replace(/\.\./g, ".");
}

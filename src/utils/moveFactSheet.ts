import { Chess } from "chess.js";
import { isDeliveredCheckmate } from "../analysis/mateDetection";
import type { AnalyzedMove } from "../types";
import { getMeta } from "./classificationMeta";
import { playedMatchesEngineBest } from "./bestMoveSuggestion";
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

export function bestMoveSanForDisplay(move: AnalyzedMove): string | null {
  if (move.bestMoveSan) return move.bestMoveSan;
  if (!move.bestMove || move.bestMove.length < 4 || !move.fenBefore) return null;
  try {
    const chess = new Chess(move.fenBefore);
    const from = move.bestMove.slice(0, 2);
    const to = move.bestMove.slice(2, 4);
    const promotion = move.bestMove[4] as "q" | "r" | "b" | "n" | undefined;
    const m = chess.move({ from, to, promotion });
    return m?.san ?? null;
  } catch {
    return null;
  }
}

function bestWasLabel(move: AnalyzedMove): string {
  const san = bestMoveSanForDisplay(move);
  if (!san) return EMPTY;
  if (playedMatchesEngineBest(move)) return "Same as played";
  return san;
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
      bestWas: EMPTY,
      winChange: "0%",
      opening: openingLabel(move, options),
      played: move.san,
    };
  }

  return {
    classification,
    classificationColor,
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

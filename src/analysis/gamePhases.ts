import type { AnalyzedMove, PhaseAccuracyStats, PhaseSideAccuracy } from "../types";
import {
  caps2AccuracyForMoves,
  type Caps2AccuracyOptions,
} from "./caps2Accuracy";

export type GamePhase = "opening" | "middlegame" | "endgame";

export type { PhaseAccuracyStats, PhaseSideAccuracy };

/** Queen=9, Rook=5, Bishop/Knight=3 — both sides combined (Stockfish-style npm units). */
export function nonPawnMaterial(fen: string): {
  total: number;
  white: number;
  black: number;
  whiteQueen: boolean;
  blackQueen: boolean;
} {
  const board = fen.split(/\s+/)[0] ?? "";
  let white = 0;
  let black = 0;
  let whiteQueen = false;
  let blackQueen = false;
  for (const ch of board) {
    switch (ch) {
      case "Q":
        white += 9;
        whiteQueen = true;
        break;
      case "q":
        black += 9;
        blackQueen = true;
        break;
      case "R":
        white += 5;
        break;
      case "r":
        black += 5;
        break;
      case "B":
      case "N":
        white += 3;
        break;
      case "b":
      case "n":
        black += 3;
        break;
      default:
        break;
    }
  }
  return {
    total: white + black,
    white,
    black,
    whiteQueen,
    blackQueen,
  };
}

/**
 * Endgame latch condition (aligned with SF tapering / Chess.com report-card spirit):
 * queens traded with limited minors/majors, or very low remaining non-pawn mass.
 */
export function isEndgameFen(fen: string): boolean {
  const npm = nonPawnMaterial(fen);
  if (npm.total <= 14) return true;
  if (!npm.whiteQueen && !npm.blackQueen && npm.total <= 26) return true;
  if (npm.total <= 22 && (!npm.whiteQueen || !npm.blackQueen)) return true;
  return false;
}

/**
 * Last index still counted as opening.
 * Continuous book from the start, then early out-of-book play while material
 * stays near the initial npm (significant trades → middlegame).
 */
export function openingEndIndex(moves: AnalyzedMove[]): number {
  if (!moves.length) return -1;

  let lastBook = -1;
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i]!;
    if (m.classification === "book" || m.inOpeningBook) lastBook = i;
    else break;
  }

  const startNpm = nonPawnMaterial(moves[0]!.fenBefore).total;
  let end = lastBook;

  for (let i = lastBook + 1; i < moves.length; i++) {
    const m = moves[i]!;
    if (isEndgameFen(m.fenBefore)) break;

    // Material has blown open (≈ two minors or a rook equivalent traded).
    const npm = nonPawnMaterial(m.fenBefore).total;
    if (npm <= startNpm - 8) break;

    // Without book coverage, opening report ends around move 12.
    if (lastBook < 0 && m.moveNumber > 12) break;

    // Hard cap even after book: late development is middlegame.
    if (m.moveNumber > 16) break;

    end = i;
  }

  // Pure miniatures / no book: treat early high-material play as opening.
  if (end < 0) {
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i]!;
      if (isEndgameFen(m.fenBefore)) break;
      if (m.moveNumber > 12) break;
      end = i;
    }
  }

  return end;
}

/** Per-ply phase labels; endgame latches once entered. */
export function assignGamePhases(moves: AnalyzedMove[]): GamePhase[] {
  const phases: GamePhase[] = new Array(moves.length);
  const openEnd = openingEndIndex(moves);
  let endgameStarted = false;

  for (let i = 0; i < moves.length; i++) {
    const fen = moves[i]!.fenBefore;
    if (endgameStarted || isEndgameFen(fen)) {
      endgameStarted = true;
      phases[i] = "endgame";
      continue;
    }
    if (i <= openEnd) {
      phases[i] = "opening";
      continue;
    }
    phases[i] = "middlegame";
  }

  return phases;
}

function sideAccuracyOrNull(
  moves: AnalyzedMove[],
  color: "w" | "b",
  options: Caps2AccuracyOptions = {}
): number | null {
  const exclude = options.excludeBookAndForced === true;
  let scored = 0;
  for (const m of moves) {
    if (m.color !== color || !m.classification) continue;
    if (exclude && (m.classification === "book" || m.forced)) continue;
    scored++;
  }
  if (scored === 0) return null;
  return caps2AccuracyForMoves(moves, color, options);
}

/** CAPS2 phase accuracies (same formula / options as overall). */
export function computePhaseAccuracies(
  moves: AnalyzedMove[],
  options: Caps2AccuracyOptions = {}
): PhaseAccuracyStats {
  const empty: PhaseSideAccuracy = { white: null, black: null };
  if (!moves.length) {
    return { opening: empty, middlegame: empty, endgame: empty };
  }

  const phases = assignGamePhases(moves);
  const buckets: Record<GamePhase, AnalyzedMove[]> = {
    opening: [],
    middlegame: [],
    endgame: [],
  };
  for (let i = 0; i < moves.length; i++) {
    buckets[phases[i]!].push(moves[i]!);
  }

  const side = (phase: GamePhase): PhaseSideAccuracy => ({
    white: sideAccuracyOrNull(buckets[phase], "w", options),
    black: sideAccuracyOrNull(buckets[phase], "b", options),
  });

  return {
    opening: side("opening"),
    middlegame: side("middlegame"),
    endgame: side("endgame"),
  };
}

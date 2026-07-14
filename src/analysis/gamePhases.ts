import type { AnalyzedMove, PhaseAccuracyStats, PhaseSideAccuracy } from "../types";
import {
  caps2AccuracyForMoves,
  type Caps2AccuracyOptions,
} from "./caps2Accuracy";

export type GamePhase = "opening" | "middlegame" | "endgame";

export type { PhaseAccuracyStats, PhaseSideAccuracy };

/**
 * Lichess game-phase divider (scalachess `Divider.scala`).
 * https://github.com/lichess-org/scalachess/blob/master/core/src/main/scala/Divider.scala
 *
 * - Middlegame starts at the first position where majors+minors ≤ 10,
 *   a back rank is sparse (< 4 pieces), or “mixedness” > 150.
 * - Endgame starts at the first position where majors+minors ≤ 6
 *   (only after a middlegame candidate exists).
 * - Phases only move forward; if middlegame and endgame would start on
 *   the same ply, middlegame is omitted (Lichess chart treats the
 *   pre-end stretch as middlegame).
 */
export interface PhaseDivision {
  /** Ply index where middlegame starts, if any. */
  middle: number | null;
  /** Ply index where endgame starts, if any. */
  end: number | null;
}

interface ColorBoards {
  white: boolean[];
  black: boolean[];
  occupied: boolean[];
  pawns: boolean[];
  kings: boolean[];
}

/** Parse FEN into bitboard-like occupancy keyed by square = file + 8*rank (rank 0 = white's home). */
function parseFenBoard(fen: string): ColorBoards {
  const rows = (fen.split(/\s+/)[0] ?? "").split("/");
  const white = Array.from({ length: 64 }, () => false);
  const black = Array.from({ length: 64 }, () => false);
  const occupied = Array.from({ length: 64 }, () => false);
  const pawns = Array.from({ length: 64 }, () => false);
  const kings = Array.from({ length: 64 }, () => false);

  for (let fenRank = 0; fenRank < 8; fenRank++) {
    const rank = 7 - fenRank;
    const row = rows[fenRank] ?? "";
    let file = 0;
    for (const ch of row) {
      if (ch >= "1" && ch <= "8") {
        file += Number(ch);
        continue;
      }
      if (file > 7) break;
      const sq = file + 8 * rank;
      occupied[sq] = true;
      const isWhite = ch === ch.toUpperCase();
      if (isWhite) white[sq] = true;
      else black[sq] = true;
      const lower = ch.toLowerCase();
      if (lower === "p") pawns[sq] = true;
      if (lower === "k") kings[sq] = true;
      file += 1;
    }
  }

  return { white, black, occupied, pawns, kings };
}

/** Queens, rooks, bishops, knights — kings and pawns excluded. */
export function majorsAndMinors(fen: string): number {
  const b = parseFenBoard(fen);
  let n = 0;
  for (let i = 0; i < 64; i++) {
    if (b.occupied[i] && !b.kings[i] && !b.pawns[i]) n += 1;
  }
  return n;
}

/** Sparse back-rank: fewer than 4 pieces (any) on white's 1st or black's 8th. */
export function backrankSparse(fen: string): boolean {
  const b = parseFenBoard(fen);
  let whiteHome = 0;
  let blackHome = 0;
  for (let file = 0; file < 8; file++) {
    if (b.white[file]) whiteHome += 1;
    if (b.black[56 + file]) blackHome += 1;
  }
  return whiteHome < 4 || blackHome < 4;
}

function mixednessScore(y: number, white: number, black: number): number {
  // Port of Divider.score(y)(white, black)
  if (white === 0 && black === 0) return 0;

  if (black === 0) {
    if (white === 1) return 1 + (8 - y);
    if (white === 2) return y > 2 ? 2 + (y - 2) : 0;
    if (white === 3 || white === 4) return y > 1 ? 3 + (y - 1) : 0;
    return 0;
  }

  if (black === 1) {
    if (white === 0) return 1 + y;
    if (white === 1) return 5 + Math.abs(4 - y);
    if (white === 2) return 4 + (y - 1);
    if (white === 3) return 5 + (y - 1);
    return 0;
  }

  if (black === 2) {
    if (white === 0) return y < 6 ? 2 + (6 - y) : 0;
    if (white === 1) return 4 + (7 - y);
    if (white === 2) return 7;
    return 0;
  }

  if (black === 3) {
    if (white === 0) return y < 7 ? 3 + (7 - y) : 0;
    if (white === 1) return 5 + (7 - y);
    return 0;
  }

  if (black === 4 && white === 0) return y < 7 ? 3 + (7 - y) : 0;
  return 0;
}

/** Lichess “mixedness” over every 2×2 block (higher ⇒ pieces are more interleaved). */
export function mixedness(fen: string): number {
  const b = parseFenBoard(fen);
  let acc = 0;
  for (let y = 0; y <= 6; y++) {
    for (let x = 0; x <= 6; x++) {
      let white = 0;
      let black = 0;
      for (const [df, dr] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ] as const) {
        const sq = x + df + 8 * (y + dr);
        if (b.white[sq]) white += 1;
        if (b.black[sq]) black += 1;
      }
      acc += mixednessScore(y + 1, white, black);
    }
  }
  return acc;
}

function isMiddlegameBoard(fen: string): boolean {
  return (
    majorsAndMinors(fen) <= 10 ||
    backrankSparse(fen) ||
    mixedness(fen) > 150
  );
}

function isEndgameBoard(fen: string): boolean {
  return majorsAndMinors(fen) <= 6;
}

/** True when this FEN alone would qualify as a Lichess endgame board. */
export function isEndgameFen(fen: string): boolean {
  return isEndgameBoard(fen);
}

/**
 * Compute Lichess Division indices over a sequence of boards (typically
 * each move's `fenBefore`).
 */
export function dividePhases(fens: string[]): PhaseDivision {
  let midGame: number | null = null;
  for (let i = 0; i < fens.length; i++) {
    if (isMiddlegameBoard(fens[i]!)) {
      midGame = i;
      break;
    }
  }

  let endGame: number | null = null;
  if (midGame != null) {
    for (let i = 0; i < fens.length; i++) {
      if (isEndgameBoard(fens[i]!)) {
        endGame = i;
        break;
      }
    }
  }

  // Drop middlegame marker when it would start at/after endgame (same as Lichess).
  const middle =
    midGame != null && (endGame == null || midGame < endGame) ? midGame : null;

  return { middle, end: endGame };
}

/**
 * Last opening ply index, or -1 when the game has no opening segment
 * (e.g. middlegame omitted and endgame starts immediately).
 */
export function openingEndIndex(moves: AnalyzedMove[]): number {
  if (!moves.length) return -1;
  const { middle, end } = dividePhases(moves.map((m) => m.fenBefore));
  if (middle != null) return middle - 1;
  if (end != null) return -1; // Lichess charts pre-end as middlegame
  return moves.length - 1;
}

/** Per-ply phase labels using Lichess Divider rules. */
export function assignGamePhases(moves: AnalyzedMove[]): GamePhase[] {
  const phases: GamePhase[] = new Array(moves.length);
  if (!moves.length) return phases;

  const { middle, end } = dividePhases(moves.map((m) => m.fenBefore));

  for (let i = 0; i < moves.length; i++) {
    if (end != null && i >= end) {
      phases[i] = "endgame";
    } else if (middle != null && i >= middle) {
      phases[i] = "middlegame";
    } else if (middle == null && end != null) {
      // Lichess chart: when middlegame marker is missing, label pre-end as middlegame.
      phases[i] = "middlegame";
    } else {
      phases[i] = "opening";
    }
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

import { describe, expect, it } from "vitest";
import type { AnalyzedMove, MoveClassification } from "../types";
import {
  assignGamePhases,
  backrankSparse,
  computePhaseAccuracies,
  dividePhases,
  isEndgameFen,
  majorsAndMinors,
  mixedness,
  openingEndIndex,
} from "./gamePhases";

function move(
  partial: Partial<AnalyzedMove> &
    Pick<AnalyzedMove, "fenBefore" | "color" | "moveNumber">
): AnalyzedMove {
  return {
    san: "e4",
    uci: "e2e4",
    fenAfter: partial.fenBefore,
    evalBefore: null,
    evalAfter: null,
    eBest: 0.5,
    eActual: 0.5,
    deltaE: 0,
    classification: "best",
    epLoss: 0,
    ...partial,
  };
}

const START =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
/** K+P vs K — 0 majors/minors → endgame. */
const BARE_KINGS = "4k3/8/8/8/8/8/4P3/4K3 w - - 0 40";
/** Two rooks each side, no queens — 4 pieces → Lichess endgame. */
const FOUR_ROOKS = "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 30";
/** Queen + rook each — 4 pieces → Lichess endgame (was middlegame under npm rules). */
const QUEEN_ROOK =
  "4k3/4qr2/8/8/8/8/4QR2/4K3 w - - 0 40";
/** Queens off but all minors/rooks remain — 12 majors, full back ranks → still opening board. */
const NO_QUEENS_HEAVY =
  "rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 10";
/** Developed position: black back rank sparse (<4) → Lichess middlegame, not endgame. */
const MIDGAME_SPARSE =
  "3q1rk1/pp1bpppp/2n1pn2/3p4/3P1B2/2N1PN2/PP2BPPP/R2Q1RK1 w - - 0 10";

describe("Lichess Divider board heuristics", () => {
  it("counts 14 majors/minors at the start", () => {
    expect(majorsAndMinors(START)).toBe(14);
    expect(backrankSparse(START)).toBe(false);
    expect(mixedness(START)).toBe(0);
    expect(isEndgameFen(START)).toBe(false);
  });

  it("treats ≤6 majors/minors as endgame boards", () => {
    expect(majorsAndMinors(BARE_KINGS)).toBe(0);
    expect(isEndgameFen(BARE_KINGS)).toBe(true);

    expect(majorsAndMinors(FOUR_ROOKS)).toBe(4);
    expect(isEndgameFen(FOUR_ROOKS)).toBe(true);

    expect(majorsAndMinors(QUEEN_ROOK)).toBe(4);
    expect(isEndgameFen(QUEEN_ROOK)).toBe(true);
  });

  it("does not call packed queenless middlegame material an endgame yet", () => {
    expect(majorsAndMinors(NO_QUEENS_HEAVY)).toBe(12);
    expect(isEndgameFen(NO_QUEENS_HEAVY)).toBe(false);
  });

  it("detects sparse back ranks after development", () => {
    expect(backrankSparse(MIDGAME_SPARSE)).toBe(true);
    expect(isEndgameFen(MIDGAME_SPARSE)).toBe(false);
  });
});

describe("dividePhases / assignGamePhases", () => {
  it("keeps the starting stretch as opening until a mid trigger", () => {
    const moves: AnalyzedMove[] = [
      move({ fenBefore: START, color: "w", moveNumber: 1 }),
      move({ fenBefore: START, color: "b", moveNumber: 1 }),
      move({ fenBefore: MIDGAME_SPARSE, color: "w", moveNumber: 8 }),
      move({ fenBefore: MIDGAME_SPARSE, color: "b", moveNumber: 8 }),
      move({ fenBefore: QUEEN_ROOK, color: "w", moveNumber: 40 }),
    ];

    const div = dividePhases(moves.map((m) => m.fenBefore));
    expect(div.middle).toBe(2);
    expect(div.end).toBe(4);

    const phases = assignGamePhases(moves);
    expect(phases).toEqual([
      "opening",
      "opening",
      "middlegame",
      "middlegame",
      "endgame",
    ]);
    expect(openingEndIndex(moves)).toBe(1);
  });

  it("classifies Q+R endings as endgame (the prior npm false middlegame)", () => {
    const moves: AnalyzedMove[] = [
      move({ fenBefore: START, color: "w", moveNumber: 1 }),
      move({
        fenBefore: MIDGAME_SPARSE,
        color: "b",
        moveNumber: 10,
        classification: "best" as MoveClassification,
      }),
      move({ fenBefore: QUEEN_ROOK, color: "w", moveNumber: 35 }),
      move({ fenBefore: QUEEN_ROOK, color: "b", moveNumber: 35 }),
    ];
    const phases = assignGamePhases(moves);
    expect(phases[0]).toBe("opening");
    expect(phases[1]).toBe("middlegame");
    expect(phases[2]).toBe("endgame");
    expect(phases[3]).toBe("endgame");
  });

  it("latches endgame once entered (later boards stay endgame via index)", () => {
    const moves: AnalyzedMove[] = [
      move({ fenBefore: START, color: "w", moveNumber: 1 }),
      move({ fenBefore: MIDGAME_SPARSE, color: "b", moveNumber: 12 }),
      move({ fenBefore: BARE_KINGS, color: "w", moveNumber: 40 }),
      move({
        // Illegal material swing; end index already latched from prior board.
        fenBefore: START,
        color: "b",
        moveNumber: 41,
      }),
    ];
    // Once end starts at index 2, index 3 is also ≥ end → endgame.
    const phases = assignGamePhases(moves);
    expect(phases[2]).toBe("endgame");
    expect(phases[3]).toBe("endgame");
  });
});

describe("computePhaseAccuracies", () => {
  it("counts book-only opening as perfect accuracy", () => {
    const moves: AnalyzedMove[] = [
      move({
        fenBefore: START,
        color: "w",
        moveNumber: 1,
        classification: "book",
        inOpeningBook: true,
        epLoss: 0,
      }),
      move({
        fenBefore: START,
        color: "b",
        moveNumber: 1,
        classification: "book",
        inOpeningBook: true,
        epLoss: 0,
      }),
    ];
    const acc = computePhaseAccuracies(moves);
    expect(acc.opening.white).toBe(99.9);
    expect(acc.opening.black).toBe(99.9);
    expect(acc.middlegame.white).toBeNull();
    expect(acc.endgame.white).toBeNull();

    const excluded = computePhaseAccuracies(moves, {
      excludeBookAndForced: true,
    });
    expect(excluded.opening.white).toBeNull();
    expect(excluded.opening.black).toBeNull();
  });

  it("scores opening non-book moves with CAPS2", () => {
    const moves: AnalyzedMove[] = [
      move({
        fenBefore: START,
        color: "w",
        moveNumber: 1,
        classification: "book",
        inOpeningBook: true,
      }),
      move({
        fenBefore: START,
        color: "b",
        moveNumber: 1,
        classification: "best",
        epLoss: 0,
      }),
      move({
        fenBefore: START,
        color: "w",
        moveNumber: 2,
        classification: "best",
        epLoss: 0,
      }),
    ];
    const acc = computePhaseAccuracies(moves);
    expect(acc.opening.white).not.toBeNull();
    expect(acc.opening.black).not.toBeNull();
    expect(acc.opening.white!).toBeGreaterThan(95);
    expect(acc.opening.black!).toBeGreaterThan(95);
  });
});

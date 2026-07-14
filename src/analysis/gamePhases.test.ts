import { describe, expect, it } from "vitest";
import type { AnalyzedMove, MoveClassification } from "../types";
import {
  assignGamePhases,
  computePhaseAccuracies,
  isEndgameFen,
  nonPawnMaterial,
  openingEndIndex,
} from "./gamePhases";

function move(partial: Partial<AnalyzedMove> & Pick<AnalyzedMove, "fenBefore" | "color" | "moveNumber">): AnalyzedMove {
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
const AFTER_QE =
  "4k3/8/8/8/8/8/4P3/4K3 w - - 0 40"; // K+P vs K — endgame
/** Queens off, two rooks each side — npm 20, classic endgame latch. */
const NO_QUEENS_LIGHT =
  "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 30";
/** Queens off but full minors/majors remaining — still middlegame material. */
const NO_QUEENS_HEAVY =
  "rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 10";

describe("nonPawnMaterial / isEndgameFen", () => {
  it("counts full starting material as 62", () => {
    expect(nonPawnMaterial(START).total).toBe(62);
    expect(isEndgameFen(START)).toBe(false);
  });

  it("detects bare king endings as endgame", () => {
    expect(isEndgameFen(AFTER_QE)).toBe(true);
  });

  it("detects queenless low-material as endgame", () => {
    expect(nonPawnMaterial(NO_QUEENS_LIGHT).total).toBe(20);
    expect(nonPawnMaterial(NO_QUEENS_LIGHT).whiteQueen).toBe(false);
    expect(nonPawnMaterial(NO_QUEENS_LIGHT).blackQueen).toBe(false);
    expect(isEndgameFen(NO_QUEENS_LIGHT)).toBe(true);
  });

  it("keeps queenless high-material out of endgame", () => {
    expect(nonPawnMaterial(NO_QUEENS_HEAVY).whiteQueen).toBe(false);
    expect(nonPawnMaterial(NO_QUEENS_HEAVY).blackQueen).toBe(false);
    expect(nonPawnMaterial(NO_QUEENS_HEAVY).total).toBeGreaterThan(26);
    expect(isEndgameFen(NO_QUEENS_HEAVY)).toBe(false);
  });
});

describe("assignGamePhases", () => {
  it("keeps continuous book in opening then middlegame", () => {
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
        classification: "book",
        inOpeningBook: true,
      }),
      move({
        fenBefore: START,
        color: "w",
        moveNumber: 2,
        classification: "best",
        epLoss: 0,
      }),
      move({
        fenBefore: START,
        color: "b",
        moveNumber: 2,
        classification: "best",
        epLoss: 0.02,
      }),
      move({
        fenBefore: START,
        color: "w",
        moveNumber: 10,
        classification: "excellent",
        epLoss: 0.04,
      }),
      move({
        fenBefore: START,
        color: "b",
        moveNumber: 10,
        classification: "good",
        epLoss: 0.06,
      }),
      move({
        fenBefore: START,
        color: "w",
        moveNumber: 18,
        classification: "best",
        epLoss: 0,
      }),
      move({
        fenBefore: AFTER_QE,
        color: "b",
        moveNumber: 40,
        classification: "best",
        epLoss: 0,
      }),
    ];

    const openEnd = openingEndIndex(moves);
    expect(openEnd).toBeGreaterThanOrEqual(1);

    const phases = assignGamePhases(moves);
    expect(phases[0]).toBe("opening");
    expect(phases[1]).toBe("opening");
    expect(phases[phases.length - 1]).toBe("endgame");
    expect(phases.some((p) => p === "middlegame")).toBe(true);
  });

  it("latches endgame once entered", () => {
    const moves: AnalyzedMove[] = [
      move({
        fenBefore: START,
        color: "w",
        moveNumber: 1,
        classification: "book" as MoveClassification,
      }),
      move({
        fenBefore: AFTER_QE,
        color: "b",
        moveNumber: 30,
        classification: "best",
      }),
      move({
        fenBefore: START, // even if npm rises (illegal in practice), latch holds
        color: "w",
        moveNumber: 31,
        classification: "best",
      }),
    ];
    const phases = assignGamePhases(moves);
    expect(phases[1]).toBe("endgame");
    expect(phases[2]).toBe("endgame");
  });
});

describe("computePhaseAccuracies", () => {
  it("returns null when a phase has no scored moves for a side", () => {
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
        classification: "book",
        inOpeningBook: true,
      }),
    ];
    const acc = computePhaseAccuracies(moves);
    expect(acc.opening.white).toBeNull();
    expect(acc.opening.black).toBeNull();
    expect(acc.middlegame.white).toBeNull();
    expect(acc.endgame.white).toBeNull();
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

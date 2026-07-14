import { describe, expect, it } from "vitest";
import type { AnalyzedMove } from "../types";
import { buildMoveFactSheet, coachShowsBestWas } from "./moveFactSheet";

function move(
  partial: Partial<AnalyzedMove> & Pick<AnalyzedMove, "san" | "classification">
): AnalyzedMove {
  return {
    moveNumber: 10,
    color: "w",
    fenAfter: "",
    uci: "g1f3",
    bestMove: "d2d4",
    bestMoveSan: "d4",
    deltaE: 0.12,
    evalBefore: { cp: -20, depth: 18, source: "local" },
    evalAfter: { cp: -30, depth: 18, source: "local" },
    engineRank: null,
    engineLineCount: 3,
    ...partial,
  } as AnalyzedMove;
}

describe("buildMoveFactSheet", () => {
  it("returns labeled fields for a suboptimal move", () => {
    const sheet = buildMoveFactSheet(
      move({ san: "Be7", classification: "excellent", uci: "f8e7", color: "b" })
    );
    expect(sheet).not.toBeNull();
    expect(sheet!.classification).toBe("Excellent");
    expect(sheet!.bestWas).toBe("d4");
    expect(sheet!.winChange).toMatch(/%/);
    expect(sheet!.played).toBe("Be7");
  });

  it("derives best was from UCI when SAN was not stored", () => {
    const sheet = buildMoveFactSheet(
      move({
        san: "Nf3",
        classification: "excellent",
        uci: "g1f3",
        bestMoveSan: undefined,
        bestMove: "d2d4",
        fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      })
    );
    expect(sheet!.bestWas).toBe("d4");
  });

  it("hides best was when played matches engine best", () => {
    const sheet = buildMoveFactSheet(
      move({
        san: "d4",
        classification: "best",
        uci: "d2d4",
        bestMove: "d2d4",
        bestMoveSan: "d4",
        engineRank: 1,
        engineLineCount: 1,
        deltaE: 0,
        eBefore: 0.55,
        eActual: 0.55,
        evalBefore: { cp: 20, depth: 18, source: "local" },
        evalAfter: { cp: 20, depth: 18, source: "local" },
      })
    );
    expect(sheet!.bestWas).toBe("—");
    expect(sheet!.winChange).toBe("0%");
    expect(sheet!.engineRank).toBe("Engine best");
  });

  it("does not invent MultiPV top-3 when only one line was searched", () => {
    const sheet = buildMoveFactSheet(
      move({
        san: "a3",
        classification: "inaccuracy",
        uci: "a2a3",
        bestMove: "d2d4",
        bestMoveSan: "d4",
        engineRank: null,
        engineLineCount: 1,
        deltaE: 0.05,
        eBefore: 0.5,
        eActual: 0.45,
      })
    );
    expect(sheet!.engineRank).toBe("Not engine best");
    expect(sheet!.engineRank).not.toMatch(/top 3/i);
  });

  it("shows signed win-chance swing when eval changes", () => {
    const sheet = buildMoveFactSheet(
      move({
        san: "Ke2",
        classification: "blunder",
        deltaE: 0.25,
        eBefore: 0.8,
        eActual: 0.45,
        evalBefore: { cp: 500, depth: 18, source: "local" },
        evalAfter: { cp: -50, depth: 18, source: "local" },
      })
    );
    // Driven by CP bar mapping (≈ −41%), not sticky WDL EP.
    expect(sheet!.winChange).toBe("−41%");
  });

  it("shows win-chance row for book moves from expected points", () => {
    const sheet = buildMoveFactSheet(
      move({
        san: "e4",
        classification: "book",
        inOpeningBook: true,
        deltaE: 0,
        eBefore: 0.5,
        eActual: 0.53,
        evalBefore: { cp: 0, depth: 18, source: "local" },
        evalAfter: { cp: 35, depth: 18, source: "local" },
      })
    );
    expect(sheet!.winChange).toMatch(/^\+/);
  });

  it("fills opening row for book moves", () => {
    const moves: AnalyzedMove[] = [
      move({ san: "d4", classification: "book", moveNumber: 1, inOpeningBook: true, deltaE: 0 }),
      move({ san: "d5", classification: "book", color: "b", moveNumber: 1, inOpeningBook: true, deltaE: 0 }),
      move({ san: "c4", classification: "book", inOpeningBook: true, deltaE: 0 }),
    ];
    const sheet = buildMoveFactSheet(moves[2], { moveIdx: 2, moves });
    expect(sheet!.classification).toBe("Book");
    expect(sheet!.opening).toMatch(/Queen's Gambit/i);
  });

  it("coachShowsBestWas matches the Best was row", () => {
    expect(
      coachShowsBestWas(
        move({ san: "Nf3", classification: "excellent", uci: "g1f3", bestMove: "d2d4" })
      )
    ).toBe(true);
    expect(
      coachShowsBestWas(
        move({
          san: "d4",
          classification: "best",
          uci: "d2d4",
          bestMove: "d2d4",
          bestMoveSan: "d4",
        })
      )
    ).toBe(false);
    expect(coachShowsBestWas(move({ san: "e4", classification: "book", uci: "e2e4" }))).toBe(
      false
    );
  });
});

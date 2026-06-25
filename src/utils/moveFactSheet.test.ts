import { describe, expect, it } from "vitest";
import type { AnalyzedMove } from "../types";
import { buildMoveFactSheet } from "./moveFactSheet";

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
    expect(sheet!.engineRank).toMatch(/Outside top 3/);
    expect(sheet!.bestWas).toBe("d4");
    expect(sheet!.winChange).toMatch(/%/);
    expect(sheet!.played).toBe("Be7");
  });

  it("marks best move when engine rank is first", () => {
    const sheet = buildMoveFactSheet(
      move({
        san: "d4",
        classification: "best",
        uci: "d2d4",
        bestMove: "d2d4",
        bestMoveSan: "d4",
        engineRank: 1,
        deltaE: 0,
      })
    );
    expect(sheet!.engineRank).toBe("1st of 3");
    expect(sheet!.bestWas).toBe("Same as played");
    expect(sheet!.winChange).toBe("0%");
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
    expect(sheet!.engineRank).toBe("—");
  });
});

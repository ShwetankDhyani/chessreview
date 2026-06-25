import { describe, expect, it } from "vitest";
import type { AnalyzedMove } from "../types";
import { buildMoveFactSheet } from "./moveFactSheet";

function move(
  partial: Partial<AnalyzedMove> & Pick<AnalyzedMove, "san" | "classification">
): AnalyzedMove {
  return {
    moveNumber: 1,
    color: "w",
    fenAfter: "",
    uci: "d2d4",
    deltaE: 0,
    evalBefore: { cp: 0, depth: 18, source: "local" },
    evalAfter: { cp: 0, depth: 18, source: "local" },
    ...partial,
  } as AnalyzedMove;
}

describe("book fact sheet", () => {
  it("puts opening name in the opening row for book plies", () => {
    const moves: AnalyzedMove[] = [
      move({ san: "d4", classification: "book", inOpeningBook: true }),
      move({ san: "d5", classification: "book", color: "b", inOpeningBook: true }),
      move({ san: "c4", classification: "book", inOpeningBook: true, uci: "c2c4" }),
    ];
    const sheet = buildMoveFactSheet(moves[2], { moveIdx: 2, moves });
    expect(sheet!.classification).toBe("Book");
    expect(sheet!.opening).toMatch(/Queen's Gambit/i);
  });
});

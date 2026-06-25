import { describe, expect, it } from "vitest";
import type { AnalyzedMove } from "../types";
import { buildFactualMoveComment } from "./factualMoveComment";

function move(
  partial: Partial<AnalyzedMove> & Pick<AnalyzedMove, "san" | "classification">
): AnalyzedMove {
  return {
    moveNumber: 1,
    color: "w",
    fenAfter: "",
    uci: "d2d4",
    deltaE: 0,
    ...partial,
  } as AnalyzedMove;
}

describe("book factual commentary", () => {
  it("uses opening facts for book plies", () => {
    const moves: AnalyzedMove[] = [
      move({ san: "d4", classification: "book", inOpeningBook: true }),
      move({ san: "d5", classification: "book", color: "b", inOpeningBook: true }),
      move({ san: "c4", classification: "book", inOpeningBook: true }),
    ];
    const text = buildFactualMoveComment(moves[2], { moveIdx: 2, moves });
    expect(text).toMatch(/Book move/);
    expect(text).toMatch(/Queen's Gambit/i);
    expect(text).not.toMatch(/Botez|Agadmator|chef's kiss/i);
  });
});

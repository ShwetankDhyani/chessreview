import { beforeEach, describe, expect, it } from "vitest";
import { clearCoachPhraseMemory } from "./coachVariety";
import { getPositionAwareMoveComment } from "./coachPositionContext";
import type { AnalyzedMove } from "../types";

function move(
  partial: Partial<AnalyzedMove> & Pick<AnalyzedMove, "san" | "classification">
): AnalyzedMove {
  return {
    moveNumber: 1,
    color: "w",
    fenAfter: "",
    uci: "e2e4",
    deltaE: 0,
    ...partial,
  } as AnalyzedMove;
}

describe("book coach commentary", () => {
  beforeEach(() => clearCoachPhraseMemory());

  it("uses streamer-flavored book lines without repeating back-to-back", () => {
    const moves: AnalyzedMove[] = [
      move({ san: "d4", classification: "book", moveNumber: 1, color: "w", inOpeningBook: true }),
      move({ san: "d5", classification: "book", moveNumber: 1, color: "b", inOpeningBook: true }),
      move({ san: "c4", classification: "book", moveNumber: 2, color: "w", inOpeningBook: true }),
    ];
    const a = getPositionAwareMoveComment(moves[0], 0, undefined, true, moves);
    const b = getPositionAwareMoveComment(moves[1], 1, undefined, true, moves);
    const c = getPositionAwareMoveComment(moves[2], 2, undefined, true, moves);
    expect(a).toMatch(/d4/i);
    expect(b).toMatch(/d5/i);
    expect(c).toMatch(/c4|Queen's Gambit|Botez/i);
    expect(a).not.toBe(b);
  });

  it("announces leaving book on the first non-book ply", () => {
    const moves: AnalyzedMove[] = [
      move({ san: "e4", classification: "book", inOpeningBook: true }),
      move({ san: "e5", classification: "book", color: "b", inOpeningBook: true }),
      move({ san: "Qh5", classification: "inaccuracy", moveNumber: 2 }),
    ];
    const text = getPositionAwareMoveComment(moves[2], 2, undefined, true, moves);
    expect(text).toMatch(/out of book|theory ends|novelty|prep|textbook closes/i);
    expect(text).toMatch(/Qh5/i);
  });
});

import { describe, expect, it } from "vitest";
import type { AnalyzedMove } from "../types";
import { shouldSuggestBestMove } from "./bestMoveSuggestion";

function move(
  partial: Partial<AnalyzedMove> & Pick<AnalyzedMove, "classification" | "uci">
): AnalyzedMove {
  return {
    moveNumber: 1,
    color: "w",
    san: "e4",
    fenBefore: "",
    fenAfter: "",
    eBest: 0,
    eActual: 0,
    deltaE: 0,
    bestMove: "e2e4",
    ...partial,
  } as AnalyzedMove;
}

describe("shouldSuggestBestMove", () => {
  it("returns false for book openings and best classifications", () => {
    expect(shouldSuggestBestMove(move({ classification: "book", uci: "e2e4" }))).toBe(
      false
    );
    expect(
      shouldSuggestBestMove(
        move({ classification: "excellent", uci: "g1f3", inOpeningBook: true })
      )
    ).toBe(false);
    expect(shouldSuggestBestMove(move({ classification: "best", uci: "e2e4" }))).toBe(
      false
    );
  });

  it("returns false when the played move matches engine best", () => {
    expect(
      shouldSuggestBestMove(
        move({ classification: "excellent", uci: "g1f3", bestMove: "g1f3" })
      )
    ).toBe(false);
  });

  it("returns true for other classifications with a different best move", () => {
    expect(
      shouldSuggestBestMove(
        move({ classification: "good", uci: "d2d4", bestMove: "e2e4" })
      )
    ).toBe(true);
    expect(
      shouldSuggestBestMove(
        move({ classification: "mistake", uci: "g1e2", bestMove: "g1f3" })
      )
    ).toBe(true);
    expect(
      shouldSuggestBestMove(
        move({ classification: "excellent", uci: "b1c3", bestMove: "d2d4" })
      )
    ).toBe(true);
  });
});

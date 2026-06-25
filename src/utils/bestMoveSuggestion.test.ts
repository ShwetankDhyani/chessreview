import { describe, expect, it } from "vitest";
import type { AnalyzedMove } from "../types";
import {
  playedMatchesEngineBest,
  shouldShowBestContinuation,
  shouldShowBestMoveHint,
} from "./bestMoveSuggestion";

function move(
  partial: Partial<AnalyzedMove> & Pick<AnalyzedMove, "san" | "classification">
): AnalyzedMove {
  return {
    moveNumber: 10,
    color: "w",
    fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    fenAfter: "",
    uci: "e2e4",
    bestMove: "e2e4",
    deltaE: 0,
    ...partial,
  } as AnalyzedMove;
}

describe("shouldShowBestMoveHint", () => {
  it("returns false for book and forced moves", () => {
    expect(shouldShowBestMoveHint(move({ classification: "book", uci: "e2e4" }))).toBe(
      false
    );
    expect(
      shouldShowBestMoveHint(
        move({ classification: "mistake", forced: true, uci: "g1f3", bestMove: "d2d4" })
      )
    ).toBe(false);
  });

  it("returns true for inaccuracies and other non-book moves with a best line", () => {
    expect(
      shouldShowBestMoveHint(
        move({ classification: "inaccuracy", uci: "b1c3", bestMove: "d2d4" })
      )
    ).toBe(true);
    expect(
      shouldShowBestMoveHint(
        move({ classification: "excellent", uci: "e2e4", bestMove: "e2e4" })
      )
    ).toBe(true);
    expect(
      shouldShowBestMoveHint(
        move({ classification: "good", uci: "d2d4", bestMove: "e2e4" })
      )
    ).toBe(true);
  });
});

describe("shouldShowBestContinuation", () => {
  it("requires a best move but not a different played move", () => {
    expect(
      shouldShowBestContinuation(
        move({ classification: "best", uci: "e2e4", bestMove: "e2e4", bestMoveSan: "e4" })
      )
    ).toBe(true);
    expect(
      shouldShowBestContinuation(
        move({ classification: "book", uci: "e2e4", bestMove: "e2e4" })
      )
    ).toBe(false);
  });
});

describe("playedMatchesEngineBest", () => {
  it("matches by UCI or SAN", () => {
    expect(
      playedMatchesEngineBest(
        move({ san: "e4", uci: "e2e4", bestMove: "e2e4", bestMoveSan: "e4" })
      )
    ).toBe(true);
    expect(
      playedMatchesEngineBest(
        move({ san: "Nf3", uci: "g1f3", bestMove: "d2d4", bestMoveSan: "d4" })
      )
    ).toBe(false);
  });
});

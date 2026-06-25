import { describe, expect, it } from "vitest";
import type { AnalyzedMove } from "../types";
import { buildFactualMoveComment } from "./factualMoveComment";

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
    evalBefore: { cp: -200, depth: 18, source: "local" },
    evalAfter: { cp: -350, depth: 18, source: "local" },
    engineRank: null,
    engineLineCount: 3,
    ...partial,
  } as AnalyzedMove;
}

describe("buildFactualMoveComment", () => {
  it("states classification, rank, best move, and eval for a mistake", () => {
    const text = buildFactualMoveComment(
      move({ san: "Nf3", classification: "mistake", uci: "g1f3" })
    );
    expect(text).toMatch(/Mistake/);
    expect(text).toMatch(/Not in engine top 3/);
    expect(text).toMatch(/Played Nf3/);
    expect(text).toMatch(/Best was d4/);
    expect(text).toMatch(/Eval/);
    expect(text).toMatch(/win chance/);
    expect(text).not.toMatch(/right track|love to see|chef's kiss/i);
  });

  it("marks engine best when rank is 1", () => {
    const text = buildFactualMoveComment(
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
    expect(text).toMatch(/Best Move/);
    expect(text).toMatch(/Engine rank: 1st/);
    expect(text).not.toMatch(/Best was/);
  });

  it("uses book and theory facts without fluff", () => {
    const moves: AnalyzedMove[] = [
      move({ san: "e4", classification: "book", moveNumber: 1, inOpeningBook: true, deltaE: 0 }),
      move({ san: "e5", classification: "book", color: "b", moveNumber: 1, inOpeningBook: true, deltaE: 0 }),
      move({ san: "Qh5", classification: "inaccuracy", moveNumber: 2, uci: "d1h5" }),
    ];
    const book = buildFactualMoveComment(moves[0], { moveIdx: 0, moves });
    const left = buildFactualMoveComment(moves[2], { moveIdx: 2, moves });
    expect(book).toMatch(/Book move/);
    expect(left).toMatch(/Out of theory/);
    expect(left).toMatch(/Played Qh5/);
  });
});

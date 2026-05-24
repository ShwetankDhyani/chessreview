import { describe, expect, it } from "vitest";
import { classifyReviewMove, detectGreatMove } from "./classifyReviewMove";
import type { ClassifyReviewInput } from "./classifyReviewMove";

function base(overrides: Partial<ClassifyReviewInput>): ClassifyReviewInput {
  return {
    fenBefore: "start",
    fenAfter: "after",
    fenAfterBest: null,
    mover: "w",
    playedUci: "e2e4",
    eBefore: 0.5,
    eAfterPlayed: 0.48,
    eAfterBest: 0.52,
    multipvLines: [
      { multipv: 1, cp: 50, depth: 18, pv: ["e2e4"], bestMove: "e2e4" },
      { multipv: 2, cp: -150, depth: 18, pv: ["d2d4"], bestMove: "d2d4" },
    ],
    opponentPriorClass: null,
    opponentPriorEpLoss: 0,
    ...overrides,
  };
}

describe("classifyReviewMove thresholds", () => {
  it("best at zero loss", () => {
    expect(
      classifyReviewMove(
        base({ eBefore: 0.5, eAfterPlayed: 0.5, eAfterBest: 0.5, playedUci: "e2e4" })
      )
    ).toBe("best");
  });

  it("excellent up to 2%", () => {
    expect(
      classifyReviewMove(
        base({
          eBefore: 0.5,
          eAfterPlayed: 0.49,
          playedUci: "g1f3",
          multipvLines: [
            { multipv: 1, cp: 50, depth: 18, pv: ["e2e4"], bestMove: "e2e4" },
          ],
        })
      )
    ).toBe("excellent");
  });

  it("blunder above 20%", () => {
    expect(classifyReviewMove(base({ eBefore: 0.7, eAfterPlayed: 0.45 }))).toBe("blunder");
  });
});

describe("detectGreatMove", () => {
  it("requires large gap between PV1 and PV2", () => {
    expect(
      detectGreatMove(
        base({
          eBefore: 0.65,
          eAfterPlayed: 0.66,
          multipvLines: [
            { multipv: 1, cp: 400, depth: 18, pv: ["e2e4"], bestMove: "e2e4" },
            { multipv: 2, cp: 0, depth: 18, pv: ["d2d4"], bestMove: "d2d4" },
          ],
          playedUci: "e2e4",
        })
      )
    ).toBe(true);
  });
});

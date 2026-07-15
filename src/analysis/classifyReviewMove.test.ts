import { describe, expect, it } from "vitest";
import {
  classifyReviewMove,
  detectGreatMove,
  engineRankFromMultipv,
  epLossFromPlayed,
} from "./classifyReviewMove";
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

describe("epLossFromPlayed", () => {
  it("scores loss vs engine best, not vs position before", () => {
    expect(
      epLossFromPlayed(
        base({
          eBefore: 0.62,
          eAfterBest: 0.58,
          eAfterPlayed: 0.57,
          playedUci: "g1f3",
          multipvLines: [
            { multipv: 1, cp: 50, depth: 18, pv: ["e2e4"], bestMove: "e2e4" },
          ],
        })
      )
    ).toBeCloseTo(0.01, 5);
  });

  it("returns zero when the played move is engine best", () => {
    expect(
      epLossFromPlayed(
        base({
          eBefore: 0.62,
          eAfterBest: 0.58,
          eAfterPlayed: 0.54,
          playedUci: "e2e4",
        })
      )
    ).toBe(0);
  });
});

describe("classifyReviewMove thresholds", () => {
  it("best at zero loss", () => {
    expect(
      classifyReviewMove(
        base({ eBefore: 0.5, eAfterPlayed: 0.5, eAfterBest: 0.5, playedUci: "e2e4" })
      )
    ).toBe("best");
  });

  it("excellent up to 2% vs best", () => {
    expect(
      classifyReviewMove(
        base({
          eBefore: 0.5,
          eAfterPlayed: 0.49,
          eAfterBest: 0.505,
          playedUci: "g1f3",
          multipvLines: [
            { multipv: 1, cp: 50, depth: 18, pv: ["e2e4"], bestMove: "e2e4" },
          ],
        })
      )
    ).toBe("excellent");
  });

  it("blunder above 20% vs best when advantage is lost", () => {
    expect(
      classifyReviewMove(
        base({
          eBefore: 0.7,
          eAfterPlayed: 0.45,
          eAfterBest: 0.7,
          playedUci: "a2a3",
        })
      )
    ).toBe("blunder");
  });

  it("downgrades to mistake when still winning after initiative slip", () => {
    expect(
      classifyReviewMove(
        base({ eBefore: 0.82, eAfterPlayed: 0.6, eAfterBest: 0.78, playedUci: "a2a3" })
      )
    ).toBe("mistake");
    expect(
      classifyReviewMove(
        base({ eBefore: 0.75, eAfterPlayed: 0.58, eAfterBest: 0.74, playedUci: "a2a3" })
      )
    ).toBe("mistake");
    expect(
      classifyReviewMove(
        base({ eBefore: 0.75, eAfterPlayed: 0.52, eAfterBest: 0.73, playedUci: "a2a3" })
      )
    ).toBe("mistake");
    expect(
      classifyReviewMove(
        base({ eBefore: 0.7, eAfterPlayed: 0.55, eAfterBest: 0.72, playedUci: "a2a3" })
      )
    ).toBe("mistake");
  });

  it("does not blunder small slips after opponent mistake when still ahead", () => {
    const smallSlip = classifyReviewMove(
      base({
        eBefore: 0.58,
        eAfterPlayed: 0.53,
        eAfterBest: 0.565,
        playedUci: "a2a3",
        opponentPriorClass: "blunder",
        opponentPriorEpLoss: 0.25,
      })
    );
    expect(smallSlip).not.toBe("blunder");
    expect(smallSlip).toBe("good");
    expect(
      classifyReviewMove(
        base({
          eBefore: 0.65,
          eAfterPlayed: 0.55,
          eAfterBest: 0.62,
          playedUci: "a2a3",
          opponentPriorClass: "blunder",
          opponentPriorEpLoss: 0.3,
        })
      )
    ).toBe("inaccuracy");
  });

  it("keeps blunder on catastrophic swing even from a won game", () => {
    expect(
      classifyReviewMove(
        base({ eBefore: 0.85, eAfterPlayed: 0.48, eAfterBest: 0.82, playedUci: "a2a3" })
      )
    ).toBe("blunder");
    expect(
      classifyReviewMove(
        base({ eBefore: 0.8, eAfterPlayed: 0.44, eAfterBest: 0.78, playedUci: "a2a3" })
      )
    ).toBe("blunder");
  });

  it("labels missed chances after opponent errors as miss", () => {
    expect(
      classifyReviewMove(
        base({
          eBefore: 0.78,
          eAfterPlayed: 0.42,
          eAfterBest: 0.85,
          opponentPriorClass: "blunder",
          opponentPriorEpLoss: 0.35,
          epBeforeOpponentMove: 0.4,
          postOpponentEP: 0.78,
          playedUci: "a2a3",
          multipvLines: [
            { multipv: 1, cp: 400, depth: 18, pv: ["e2e4"], bestMove: "e2e4" },
          ],
        })
      )
    ).toBe("miss");
  });
});

describe("detectGreatMove", () => {
  it("requires large gap between PV1 and PV2", () => {
    expect(
      detectGreatMove(
        base({
          eBefore: 0.65,
          eAfterPlayed: 0.92,
          playerRating: 1500,
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

describe("engineRankFromMultipv", () => {
  it("returns 1-based rank when played move matches a line", () => {
    const rank = engineRankFromMultipv(
      [
        { multipv: 1, depth: 18, pv: ["e2e4"], bestMove: "e2e4" },
        { multipv: 2, depth: 18, pv: ["d2d4"], bestMove: "d2d4" },
        { multipv: 3, depth: 18, pv: ["c2c4"], bestMove: "c2c4" },
      ],
      "d2d4"
    );
    expect(rank).toBe(2);
  });

  it("returns null when played move is outside MultiPV", () => {
    const rank = engineRankFromMultipv(
      [{ multipv: 1, depth: 18, pv: ["e2e4"], bestMove: "e2e4" }],
      "a2a3"
    );
    expect(rank).toBeNull();
  });
});

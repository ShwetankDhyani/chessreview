import { describe, expect, it } from "vitest";
import {
  accuracyEpLoss,
  classificationLoss,
  classifyReviewMove,
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

describe("epLoss vs classificationLoss", () => {
  it("vs-best loss is zero when engine best is played", () => {
    expect(
      epLossFromPlayed(
        base({
          eBefore: 0.7,
          eAfterBest: 0.05,
          eAfterPlayed: 0.05,
          playedUci: "e2e4",
        })
      )
    ).toBe(0);
  });

  it("accuracy loss is Lichess-style before→after", () => {
    expect(
      accuracyEpLoss(
        base({
          eBefore: 0.7,
          eAfterBest: 0.05,
          eAfterPlayed: 0.05,
          playedUci: "e2e4",
        })
      )
    ).toBeCloseTo(0.65, 5);
  });

  it("classification falls back to absolute collapse when best-line fen is missing", () => {
    // Shallow / incomplete best fen — still punish dumping a win.
    const loss = classificationLoss(
      base({
        eBefore: 0.7,
        eAfterBest: 0.02,
        eAfterPlayed: 0.0,
        fenAfterBest: null,
        playedUci: "a2a3",
        multipvLines: [
          { multipv: 1, cp: -800, depth: 14, pv: ["e2e4"], bestMove: "e2e4" },
          { multipv: 2, cp: -900, depth: 14, pv: ["a2a3"], bestMove: "a2a3" },
        ],
      })
    );
    expect(loss).toBeGreaterThanOrEqual(0.65);
  });

  it("classification prefers vs-best when deep best-line fen exists", () => {
    const loss = classificationLoss(
      base({
        eBefore: 0.7,
        eAfterBest: 0.02,
        eAfterPlayed: 0.0,
        fenAfterBest: "after-best",
        playedUci: "a2a3",
        multipvLines: [
          { multipv: 1, cp: -800, depth: 14, pv: ["e2e4"], bestMove: "e2e4" },
          { multipv: 2, cp: -900, depth: 14, pv: ["a2a3"], bestMove: "a2a3" },
        ],
      })
    );
    expect(loss).toBeCloseTo(0.02, 5);
  });
});

describe("classifyReviewMove core labels", () => {
  it("best when engine best is played", () => {
    expect(
      classifyReviewMove(
        base({ eBefore: 0.5, eAfterPlayed: 0.5, eAfterBest: 0.5, playedUci: "e2e4" })
      )
    ).toBe("best");
  });

  it("good for small slips — never excellent", () => {
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
    ).toBe("good");
  });

  it("never calls a mate walk excellent/good when you had winning chances", () => {
    const c = classifyReviewMove(
      base({
        eBefore: 0.72,
        eAfterBest: 0.02,
        eAfterPlayed: 0.0,
        playedUci: "a2a3",
        multipvLines: [
          { multipv: 1, cp: -700, depth: 14, pv: ["e2e4"], bestMove: "e2e4" },
          { multipv: 2, mate: -1, depth: 14, pv: ["a2a3"], bestMove: "a2a3" },
        ],
      })
    );
    expect(["excellent", "good", "best", "brilliant", "great"]).not.toContain(c);
    expect(["mistake", "blunder", "inaccuracy"]).toContain(c);
  });

  it("blunder above 20% when advantage is lost", () => {
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
  });

  it("does not emit miss / brilliant / great / excellent", () => {
    const missish = classifyReviewMove(
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
    );
    expect(["miss", "brilliant", "great", "excellent"]).not.toContain(missish);
    expect(["inaccuracy", "mistake", "blunder"]).toContain(missish);
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

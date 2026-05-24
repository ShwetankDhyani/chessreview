import { describe, expect, it } from "vitest";
import { classifyReviewMove } from "./classifyReviewMove";
import type { ClassifyReviewInput } from "./classifyReviewMove";
import { isDeliveredCheckmate } from "./mateDetection";

const SCHOLARS_MATE_FEN =
  "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4";

describe("isDeliveredCheckmate", () => {
  it("detects checkmate on the following position", () => {
    expect(isDeliveredCheckmate(SCHOLARS_MATE_FEN)).toBe(true);
  });
});

describe("classifyReviewMove on mate", () => {
  it("labels delivering checkmate as best even with bad engine cp", () => {
    const input: ClassifyReviewInput = {
      fenBefore: "start",
      fenAfter: SCHOLARS_MATE_FEN,
      fenAfterBest: null,
      mover: "w",
      playedUci: "h7h8",
      eBefore: 0.9,
      eAfterPlayed: 0,
      eAfterBest: 0,
      multipvLines: [],
      opponentPriorClass: null,
      opponentPriorEpLoss: 0,
    };
    expect(classifyReviewMove(input)).toBe("best");
  });
});

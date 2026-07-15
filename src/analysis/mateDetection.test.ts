import { describe, expect, it } from "vitest";
import { classifyReviewMove } from "./classifyReviewMove";
import type { ClassifyReviewInput } from "./classifyReviewMove";
import {
  everyMoveWalksIntoMateInOne,
  isDeliveredCheckmate,
  walksIntoMateInOne,
} from "./mateDetection";

const SCHOLARS_MATE_FEN =
  "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4";

/** Black to move after 1.e4 e5 2.Qh5 Nc6 3.Bc4 — Nf6?? walks into Qxf7#. */
const BEFORE_HANG_MATE =
  "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3";
const AFTER_NF6_HANG =
  "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4";

describe("isDeliveredCheckmate", () => {
  it("detects checkmate on the following position", () => {
    expect(isDeliveredCheckmate(SCHOLARS_MATE_FEN)).toBe(true);
  });
});

describe("walksIntoMateInOne", () => {
  it("flags a move that allows mate on the next ply", () => {
    expect(walksIntoMateInOne(AFTER_NF6_HANG)).toBe(true);
    expect(everyMoveWalksIntoMateInOne(BEFORE_HANG_MATE)).toBe(false);
  });
});

describe("classifyReviewMove on mate", () => {
  it("labels delivering checkmate as best even with bad engine cp", () => {
    const input: ClassifyReviewInput = {
      fenBefore: "start",
      fenAfter: SCHOLARS_MATE_FEN,
      fenAfterBest: null,
      mover: "w",
      playedUci: "h5f7",
      eBefore: 0.9,
      eAfterPlayed: 0,
      eAfterBest: 0,
      multipvLines: [],
      opponentPriorClass: null,
      opponentPriorEpLoss: 0,
    };
    expect(classifyReviewMove(input)).toBe("best");
  });

  it("never labels hanging mate-in-1 as good — even if engine ranked it best", () => {
    const input: ClassifyReviewInput = {
      fenBefore: BEFORE_HANG_MATE,
      fenAfter: AFTER_NF6_HANG,
      fenAfterBest: null,
      mover: "b",
      playedUci: "g8f6",
      eBefore: 0.35,
      eAfterPlayed: 0.3,
      eAfterBest: 0.3,
      multipvLines: [
        { multipv: 1, cp: -80, depth: 12, pv: ["g8f6"], bestMove: "g8f6" },
      ],
      opponentPriorClass: null,
      opponentPriorEpLoss: 0,
    };
    expect(classifyReviewMove(input)).toBe("blunder");
  });
});

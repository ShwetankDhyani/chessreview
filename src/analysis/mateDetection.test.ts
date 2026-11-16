import { describe, expect, it } from "vitest";
import { classifyReviewMove } from "./classifyReviewMove";
import type { ClassifyReviewInput } from "./classifyReviewMove";
import {
  detectTerminalPosition,
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

describe("detectTerminalPosition", () => {
  it("detects White delivering checkmate", () => {
    const res = detectTerminalPosition(SCHOLARS_MATE_FEN);
    expect(res.isTerminal).toBe(true);
    expect(res.isCheckmate).toBe(true);
    expect(res.isStalemate).toBe(false);
    expect(res.mate).toBe(1);
    expect(res.wdl).toEqual({ w: 1000, d: 0, l: 0 });
  });

  it("detects Black delivering checkmate (Fool's mate)", () => {
    const foolsMate = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";
    const res = detectTerminalPosition(foolsMate);
    expect(res.isTerminal).toBe(true);
    expect(res.isCheckmate).toBe(true);
    expect(res.isStalemate).toBe(false);
    expect(res.mate).toBe(-1);
    expect(res.wdl).toEqual({ w: 0, d: 0, l: 1000 });
  });

  it("detects stalemate as drawn terminal position", () => {
    const stalemate = "7k/5Q2/6K1/8/8/8/8/8 b - - 0 1";
    const res = detectTerminalPosition(stalemate);
    expect(res.isTerminal).toBe(true);
    expect(res.isCheckmate).toBe(false);
    expect(res.isStalemate).toBe(true);
    expect(res.cp).toBe(0);
    expect(res.mate).toBeUndefined();
    expect(res.wdl).toEqual({ w: 0, d: 1000, l: 0 });
  });

  it("returns isTerminal false for normal active positions", () => {
    const start = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const res = detectTerminalPosition(start);
    expect(res.isTerminal).toBe(false);
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

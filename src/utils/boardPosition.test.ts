import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import {
  BOARD_START_FEN,
  canAnimateBoardStep,
  canAnimateUndoStep,
  highlightFromUci,
  resolveBoardNavStep,
} from "./boardPosition";

function buildSampleMoves() {
  const c = new Chess();
  const e4 = c.move("e4")!;
  const afterE4 = c.fen();
  const e5 = c.move("e5")!;
  const afterE5 = c.fen();
  return {
    moves: [
      {
        san: e4.san,
        uci: "e2e4",
        fenBefore: BOARD_START_FEN,
        fenAfter: afterE4,
      },
      {
        san: e5.san,
        uci: "e7e5",
        fenBefore: afterE4,
        fenAfter: afterE5,
      },
    ],
    afterE4,
    afterE5,
  };
}

describe("canAnimateUndoStep", () => {
  it("accepts undoing the last played move", () => {
    const { moves, afterE4, afterE5 } = buildSampleMoves();
    const hl = highlightFromUci(moves[1].uci)!;
    expect(canAnimateUndoStep(afterE5, afterE4, hl)).toBe(true);
  });
});

describe("resolveBoardNavStep", () => {
  it("uses the undone move highlight when stepping back one ply", () => {
    const { moves } = buildSampleMoves();
    const { fen, highlight } = resolveBoardNavStep(moves, 1, 0);
    expect(fen).toBe(moves[0].fenAfter);
    expect(highlight).toEqual(highlightFromUci(moves[1].uci));
  });

  it("uses the played move highlight when stepping forward one ply", () => {
    const { moves } = buildSampleMoves();
    const { highlight } = resolveBoardNavStep(moves, -1, 0);
    expect(highlight).toEqual(highlightFromUci(moves[0].uci));
  });
});

describe("canAnimateBoardStep", () => {
  it("allows forward and backward single-ply steps", () => {
    const { moves, afterE4, afterE5 } = buildSampleMoves();
    const forward = highlightFromUci(moves[1].uci)!;
    const back = highlightFromUci(moves[1].uci)!;
    expect(canAnimateBoardStep(afterE4, afterE5, forward)).toBe(true);
    expect(canAnimateBoardStep(afterE5, afterE4, back)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import {
  BOARD_START_FEN,
  canAnimateBoardStep,
  canAnimateUndoStep,
  highlightFromMove,
  highlightFromUci,
  resolveBoardLastMoveHighlight,
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

describe("highlightFromMove", () => {
  it("uses UCI when present", () => {
    expect(highlightFromMove({ uci: "e2e4" })).toEqual({ from: "e2", to: "e4" });
  });

  it("falls back to SAN on fenBefore when UCI is missing", () => {
    const hl = highlightFromMove({
      san: "e4",
      fenBefore: new Chess().fen(),
    });
    expect(hl).toEqual({ from: "e2", to: "e4" });
  });

  it("rejects malformed UCI", () => {
    expect(highlightFromUci("zz")).toBeNull();
    expect(highlightFromUci("e2e9")).toBeNull();
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

describe("resolveBoardLastMoveHighlight", () => {
  it("highlights current move during standard game review", () => {
    const { moves } = buildSampleMoves();
    const hl = resolveBoardLastMoveHighlight({
      currentMoveIdx: 1,
      moves,
    });
    expect(hl).toEqual({ from: "e7", to: "e5" });
  });

  it("updates highlight to continuation move and does not stick to game move", () => {
    const { moves } = buildSampleMoves();
    // User is reviewing move 1 (e7e5), but steps into better line continuation (h2h3)
    const hl = resolveBoardLastMoveHighlight({
      continuationFen: "some-continuation-fen",
      continuationHighlight: { from: "h2", to: "h3" },
      currentMoveIdx: 1,
      moves,
    });
    // Must highlight h2-h3, NOT stick to moves[0] (e2-e4)
    expect(hl).toEqual({ from: "h2", to: "h3" });
  });

  it("advances continuation highlight with each ply", () => {
    const { moves } = buildSampleMoves();
    const ply2 = resolveBoardLastMoveHighlight({
      continuationFen: "ply-2-fen",
      continuationHighlight: { from: "e8", to: "g8" },
      currentMoveIdx: 1,
      moves,
    });
    expect(ply2).toEqual({ from: "e8", to: "g8" });

    const ply3 = resolveBoardLastMoveHighlight({
      continuationFen: "ply-3-fen",
      continuationHighlight: { from: "f3", to: "h2" },
      currentMoveIdx: 1,
      moves,
    });
    expect(ply3).toEqual({ from: "f3", to: "h2" });
  });

  it("highlights branch predecessor move at step 0 (back at branch)", () => {
    const { moves } = buildSampleMoves();
    const hl = resolveBoardLastMoveHighlight({
      continuationFen: "branch-start-fen",
      continuationHighlight: null,
      currentMoveIdx: 1,
      moves,
    });
    // At step 0 / branch point, highlights the move that led to branch (moves[0])
    expect(hl).toEqual({ from: "e2", to: "e4" });
  });

  it("returns null at start of game when continuationFen is at root", () => {
    const { moves } = buildSampleMoves();
    const hl = resolveBoardLastMoveHighlight({
      continuationFen: "branch-start-fen",
      continuationHighlight: null,
      currentMoveIdx: 0,
      moves,
    });
    expect(hl).toBeNull();
  });
});


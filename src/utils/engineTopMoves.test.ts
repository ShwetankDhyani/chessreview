import { describe, expect, it } from "vitest";
import { topMovesFromAnalysis } from "./engineTopMoves";

const START =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("topMovesFromAnalysis", () => {
  it("lists top 3 moves and marks the played one", () => {
    const moves = topMovesFromAnalysis(
      START,
      [
        {
          multipv: 1,
          cp: 30,
          depth: 18,
          pv: ["e2e4"],
          bestMove: "e2e4",
        },
        {
          multipv: 2,
          cp: 25,
          depth: 18,
          pv: ["d2d4"],
          bestMove: "d2d4",
        },
        {
          multipv: 3,
          cp: 20,
          depth: 18,
          pv: ["g1f3"],
          bestMove: "g1f3",
        },
      ],
      "d2d4",
      "w"
    );

    expect(moves).toHaveLength(3);
    expect(moves[0].san).toBe("e4");
    expect(moves[1].san).toBe("d4");
    expect(moves[1].isPlayed).toBe(true);
    expect(moves[2].san).toBe("Nf3");
  });

  it("flips eval labels for black to move", () => {
    const fen =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const moves = topMovesFromAnalysis(
      fen,
      [{ multipv: 1, cp: 40, depth: 18, pv: ["e7e5"], bestMove: "e7e5" }],
      "c7c5",
      "b"
    );
    expect(moves[0].evalLabel).toBe("-0.4");
  });
});

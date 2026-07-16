import { describe, expect, it } from "vitest";
import { boardMoveClassification } from "./boardMoveClassification";

describe("boardMoveClassification", () => {
  it("shows every core classification on the game position", () => {
    for (const c of [
      "book",
      "best",
      "good",
      "inaccuracy",
      "mistake",
      "blunder",
    ] as const) {
      expect(
        boardMoveClassification(c, {
          continuationFen: null,
          isAnalyzing: false,
        })
      ).toBe(c);
    }
  });

  it("keeps badges when a better-line viewer is mounted but not stepped into", () => {
    // continuationActive used to be true on mount and hid inaccuracy/blunder.
    expect(
      boardMoveClassification("inaccuracy", {
        continuationFen: null,
        isAnalyzing: false,
      })
    ).toBe("inaccuracy");
    expect(
      boardMoveClassification("blunder", {
        continuationFen: null,
        isAnalyzing: false,
      })
    ).toBe("blunder");
  });

  it("hides badges while analyzing or browsing a continuation fen", () => {
    expect(
      boardMoveClassification("blunder", {
        continuationFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        isAnalyzing: false,
      })
    ).toBeNull();
    expect(
      boardMoveClassification("mistake", {
        continuationFen: null,
        isAnalyzing: true,
      })
    ).toBeNull();
  });
});

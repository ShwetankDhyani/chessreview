import { describe, expect, it } from "vitest";
import type { AnalyzedMove } from "../types";
import {
  computeOpeningChapter,
  detectOpeningProgressive,
  isLeftBookMove,
  openingHintForMove,
} from "./openingContext";

function analyzed(
  partial: Partial<AnalyzedMove> & Pick<AnalyzedMove, "san" | "classification">
): AnalyzedMove {
  return {
    moveNumber: 1,
    color: "w",
    fenAfter: "",
    uci: "e2e4",
    deltaE: 0,
    ...partial,
  } as AnalyzedMove;
}

describe("computeOpeningChapter", () => {
  it("detects contiguous book prefix and left-book index", () => {
    const moves: AnalyzedMove[] = [
      analyzed({ san: "e4", classification: "book", moveNumber: 1, color: "w", inOpeningBook: true }),
      analyzed({ san: "e5", classification: "book", moveNumber: 1, color: "b", inOpeningBook: true }),
      analyzed({ san: "Nf3", classification: "book", moveNumber: 2, color: "w", inOpeningBook: true }),
      analyzed({ san: "Nc6", classification: "best", moveNumber: 2, color: "b" }),
    ];
    const chapter = computeOpeningChapter(moves);
    expect(chapter).not.toBeNull();
    expect(chapter!.endIdx).toBe(2);
    expect(chapter!.leftBookIdx).toBe(3);
    expect(chapter!.openingName).toMatch(/Open Game|King's Pawn/i);
    expect(isLeftBookMove(3, moves)).toBe(true);
    expect(isLeftBookMove(2, moves)).toBe(false);
  });

  it("returns null when no book moves", () => {
    const moves = [analyzed({ san: "d4", classification: "best" })];
    expect(computeOpeningChapter(moves)).toBeNull();
  });
});

describe("openingHintForMove", () => {
  it("returns full intro on first ply of a new opening name", () => {
    const moves = [analyzed({ san: "e4", classification: "book" })];
    const hint = openingHintForMove(0, moves);
    expect(hint).toMatch(/King's Pawn Opening:/);
  });

  it("returns short name when the detected opening name is unchanged", () => {
    const moves = [
      analyzed({ san: "e4", classification: "book", moveNumber: 1, color: "w" }),
      analyzed({ san: "c5", classification: "book", moveNumber: 1, color: "b" }),
      analyzed({ san: "Nf3", classification: "book", moveNumber: 2, color: "w" }),
    ];
    expect(openingHintForMove(2, moves)).toBe("Sicilian Defense");
  });
});

describe("detectOpeningProgressive", () => {
  it("matches longest Italian line", () => {
    const moves = [
      analyzed({ san: "e4", classification: "book" }),
      analyzed({ san: "e5", classification: "book", color: "b" }),
      analyzed({ san: "Nf3", classification: "book" }),
      analyzed({ san: "Nc6", classification: "book", color: "b" }),
      analyzed({ san: "Bc4", classification: "book" }),
    ];
    const opening = detectOpeningProgressive(moves, 4);
    expect(opening?.name).toBe("Italian Game");
  });
});

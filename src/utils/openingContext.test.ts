import { describe, expect, it } from "vitest";
import type { AnalyzedMove } from "../types";
import {
  computeOpeningChapter,
  computeOpeningChapterAt,
  detectOpeningProgressive,
  isLeftBookMove,
  isMoveInTheory,
  openingHintForMove,
  shouldShowOpeningTheory,
} from "./openingContext";
import type { OpeningEcoEntry } from "./openingEcoLookup";

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

const ECO_SAMPLE: OpeningEcoEntry[] = [
  { eco: "B20", name: "Sicilian Defense", moves: ["e4", "c5"] },
  {
    eco: "B90",
    name: "Sicilian Defense: Najdorf Variation",
    moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"],
  },
];

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

describe("computeOpeningChapterAt", () => {
  it("updates name and side with each theory ply", () => {
    const moves: AnalyzedMove[] = [
      analyzed({ san: "e4", classification: "book", moveNumber: 1, color: "w", inOpeningBook: true }),
      analyzed({ san: "c5", classification: "book", moveNumber: 1, color: "b", inOpeningBook: true }),
      analyzed({ san: "Nf3", classification: "book", moveNumber: 2, color: "w", inOpeningBook: true }),
      analyzed({ san: "d6", classification: "book", moveNumber: 2, color: "b", inOpeningBook: true }),
      analyzed({ san: "d4", classification: "book", moveNumber: 3, color: "w", inOpeningBook: true }),
      analyzed({ san: "cxd4", classification: "book", moveNumber: 3, color: "b", inOpeningBook: true }),
      analyzed({ san: "Nxd4", classification: "book", moveNumber: 4, color: "w", inOpeningBook: true }),
      analyzed({ san: "Nf6", classification: "book", moveNumber: 4, color: "b", inOpeningBook: true }),
      analyzed({ san: "Nc3", classification: "book", moveNumber: 5, color: "w", inOpeningBook: true }),
      analyzed({ san: "a6", classification: "book", moveNumber: 5, color: "b", inOpeningBook: true }),
      analyzed({ san: "h3", classification: "inaccuracy", moveNumber: 6, color: "w" }),
    ];

    const white = computeOpeningChapterAt(moves, 0, ECO_SAMPLE)!;
    expect(white.side).toBe("w");
    expect(white.moveSummary).toContain("White played");
    expect(white.openingName).toMatch(/King|Pawn|e4/i);

    const black = computeOpeningChapterAt(moves, 1, ECO_SAMPLE)!;
    expect(black.side).toBe("b");
    expect(black.moveSummary).toContain("Black played");
    expect(black.eco).toBe("B20");
    expect(black.openingName).toBe("Sicilian Defense");
    expect(black.moveSummary).not.toBe(white.moveSummary);

    const najdorf = computeOpeningChapterAt(moves, 9, ECO_SAMPLE)!;
    expect(najdorf.eco).toBe("B90");
    expect(najdorf.openingName).toMatch(/Najdorf/);
    expect(najdorf.side).toBe("b");

    const left = computeOpeningChapterAt(moves, 10, ECO_SAMPLE)!;
    expect(left.leftTheory).toBe(true);
    expect(left.ideas).toMatch(/Left theory/);
    expect(left.moveSummary).toContain("White played");
  });

  it("hides theory after leaving named lines", () => {
    const moves: AnalyzedMove[] = [
      analyzed({ san: "e4", classification: "book", moveNumber: 1, color: "w", inOpeningBook: true }),
      analyzed({ san: "c5", classification: "book", moveNumber: 1, color: "b", inOpeningBook: true }),
      analyzed({ san: "a3", classification: "inaccuracy", moveNumber: 2, color: "w" }),
      analyzed({ san: "d6", classification: "best", moveNumber: 2, color: "b" }),
    ];
    expect(shouldShowOpeningTheory(0, moves, ECO_SAMPLE)).toBe(true);
    expect(shouldShowOpeningTheory(1, moves, ECO_SAMPLE)).toBe(true);
    expect(shouldShowOpeningTheory(2, moves, ECO_SAMPLE)).toBe(true); // first exit
    expect(shouldShowOpeningTheory(3, moves, ECO_SAMPLE)).toBe(false);
    expect(computeOpeningChapterAt(moves, 3, ECO_SAMPLE)).toBeNull();
    expect(isMoveInTheory(3, moves, ECO_SAMPLE)).toBe(false);
  });
});

describe("openingHintForMove", () => {
  it("returns full intro on first ply of a new opening name", () => {
    const moves = [analyzed({ san: "e4", classification: "book" })];
    const hint = openingHintForMove(0, moves);
    expect(hint).toMatch(/King's Pawn Opening:/);
  });

  it("mentions the side on later unchanged plies", () => {
    const moves = [
      analyzed({ san: "e4", classification: "book", moveNumber: 1, color: "w" }),
      analyzed({ san: "c5", classification: "book", moveNumber: 1, color: "b" }),
      analyzed({ san: "Nf3", classification: "book", moveNumber: 2, color: "w" }),
    ];
    const hint = openingHintForMove(2, moves);
    expect(hint).toMatch(/White played/);
    expect(hint).toMatch(/Sicilian/);
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

import { describe, expect, it } from "vitest";
import type { AnalyzedMove, ClassificationCounts } from "../types";
import {
  accuracyFromClassificationCounts,
  caps2DisplayAccuracy,
  expectedPointsLost,
  gameAccuracyFromMoves,
  moveAccuracyFromEpLoss,
  plyAccuracyScore,
  winPercentFromCp,
} from "./accuracy";

describe("caps2DisplayAccuracy", () => {
  it("does not apply forced compression", () => {
    expect(caps2DisplayAccuracy(97)).toBe(97);
    expect(caps2DisplayAccuracy(96.7)).toBe(96.7);
  });
});

describe("plyAccuracyScore", () => {
  function mockMove(
    classification: NonNullable<AnalyzedMove["classification"]>,
    epLoss: number
  ): AnalyzedMove {
    return {
      ply: 1,
      color: "w",
      san: "e4",
      fenBefore: "",
      fenAfter: "",
      classification,
      epLoss,
    } as AnalyzedMove;
  }

  it("uses strict ep-loss score for classified non-book moves", () => {
    expect(plyAccuracyScore(mockMove("best", 0.002))).toBeGreaterThan(99);
    expect(plyAccuracyScore(mockMove("inaccuracy", 0.001))).toBeGreaterThan(99);
    expect(plyAccuracyScore(mockMove("mistake", 0.16))).toBeLessThan(80);
  });
});

describe("moveAccuracyFromEpLoss", () => {
  it("maps small losses to high but not perfect scores", () => {
    expect(moveAccuracyFromEpLoss(0)).toBe(100);
    expect(moveAccuracyFromEpLoss(0.09)).toBeLessThan(92);
    expect(moveAccuracyFromEpLoss(0.16)).toBeLessThan(80);
  });
});

describe("gameAccuracyFromMoves", () => {
  function mockMove(
    color: "w" | "b",
    classification: NonNullable<AnalyzedMove["classification"]>,
    epLoss: number
  ): AnalyzedMove {
    return {
      ply: 1,
      color,
      san: "e4",
      fenBefore: "",
      fenAfter: "",
      classification,
      epLoss,
    } as AnalyzedMove;
  }

  it("returns realistic game scores for a strong-but-imperfect profile", () => {
    const white: AnalyzedMove[] = [
      ...Array.from({ length: 17 }, () => mockMove("w", "best", 0.004)),
      mockMove("w", "excellent", 0.015),
      ...Array.from({ length: 4 }, () => mockMove("w", "book", 0.002)),
      mockMove("w", "inaccuracy", 0.09),
      mockMove("w", "inaccuracy", 0.09),
      mockMove("w", "mistake", 0.16),
    ];
    const black: AnalyzedMove[] = [
      ...Array.from({ length: 9 }, () => mockMove("b", "best", 0.004)),
      ...Array.from({ length: 4 }, () => mockMove("b", "excellent", 0.02)),
      ...Array.from({ length: 2 }, () => mockMove("b", "good", 0.05)),
      ...Array.from({ length: 3 }, () => mockMove("b", "book", 0.002)),
      ...Array.from({ length: 5 }, () => mockMove("b", "inaccuracy", 0.09)),
      mockMove("b", "mistake", 0.16),
      mockMove("b", "mistake", 0.16),
    ];

    const w = gameAccuracyFromMoves(white, "w");
    const b = gameAccuracyFromMoves(black, "b");
    expect(w).toBeGreaterThan(b);
    expect(w).toBeGreaterThanOrEqual(86);
    expect(w).toBeLessThan(95);
    expect(b).toBeGreaterThanOrEqual(74);
    expect(b).toBeLessThan(90);
  });

  it("never shows 99+ for games with multiple mistakes", () => {
    const messy = [
      ...Array.from({ length: 10 }, () => mockMove("w", "best", 0.003)),
      mockMove("w", "mistake", 0.2),
      mockMove("w", "mistake", 0.18),
      mockMove("w", "inaccuracy", 0.11),
    ];
    expect(gameAccuracyFromMoves(messy, "w")).toBeLessThan(90);
  });
});

describe("expected points model", () => {
  it("is monotonic with centipawn advantage", () => {
    expect(winPercentFromCp(200)).toBeGreaterThan(winPercentFromCp(0));
    expect(winPercentFromCp(0)).toBeGreaterThan(winPercentFromCp(-200));
  });

  it("returns zero loss when best equals played", () => {
    expect(expectedPointsLost(120, 120)).toBe(0);
  });
});

function counts(
  partial: Partial<ClassificationCounts>
): ClassificationCounts {
  return {
    brilliant: 0,
    great: 0,
    best: 0,
    excellent: 0,
    good: 0,
    book: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
    ...partial,
  };
}

describe("accuracyFromClassificationCounts", () => {
  it("remains a high diagnostic average for mostly-best move buckets", () => {
    const white = counts({
      best: 21,
      book: 1,
      inaccuracy: 2,
      mistake: 1,
    });
    expect(accuracyFromClassificationCounts(white)).toBeGreaterThan(95);
  });
});

import { describe, expect, it } from "vitest";
import type { AnalyzedMove, ClassificationCounts } from "../types";
import {
  accuracyFromClassificationCounts,
  caps2DisplayAccuracy,
  expectedPointsLost,
  gameAccuracyFromMoves,
  moveAccuracyFromEpLoss,
  winPercentFromCp,
} from "./accuracy";

describe("displayAccuracy (caps2DisplayAccuracy)", () => {
  it("does not inflate high raw scores toward 99.9", () => {
    expect(caps2DisplayAccuracy(97)).toBe(97);
    expect(caps2DisplayAccuracy(96)).toBe(96);
  });

  it("rounds and caps at 99.9", () => {
    expect(caps2DisplayAccuracy(99.95)).toBe(99.9);
    expect(caps2DisplayAccuracy(85.04)).toBe(85);
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
      evalBefore: { cp: 20 },
      evalAfter: { cp: 20 },
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
    expect(w).toBeGreaterThanOrEqual(90);
    expect(w).toBeLessThan(98);
    expect(b).toBeGreaterThanOrEqual(80);
    expect(b).toBeLessThan(90);
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

describe("accuracyFromClassificationCounts (label average only)", () => {
  it("can overstate strength vs engine-based game score", () => {
    const white = counts({
      best: 21,
      book: 1,
      inaccuracy: 2,
      mistake: 1,
    });
    const labelOnly = accuracyFromClassificationCounts(white);
    expect(labelOnly).toBeGreaterThanOrEqual(96);
  });

  it("is monotonic when improving move quality", () => {
    const baseline = counts({
      best: 12,
      good: 4,
      inaccuracy: 3,
      mistake: 2,
    });
    const improved = counts({
      best: 16,
      good: 3,
      inaccuracy: 2,
      mistake: 0,
    });
    expect(accuracyFromClassificationCounts(improved)).toBeGreaterThan(
      accuracyFromClassificationCounts(baseline)
    );
  });
});

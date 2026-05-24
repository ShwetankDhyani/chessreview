import { describe, expect, it } from "vitest";
import type { ClassificationCounts } from "../types";
import {
  accuracyFromClassificationCounts,
  caps2DisplayAccuracy,
  expectedPointsLost,
  winPercentFromCp,
} from "./accuracy";

describe("caps2DisplayAccuracy", () => {
  it("preserves near-perfect raw scores up to 99.9", () => {
    expect(caps2DisplayAccuracy(97)).toBeGreaterThanOrEqual(99);
    expect(caps2DisplayAccuracy(97)).toBeLessThanOrEqual(99.9);
  });

  it("does not crush high raw scores to the low 80s", () => {
    expect(caps2DisplayAccuracy(97)).toBeGreaterThan(90);
    expect(caps2DisplayAccuracy(96)).toBeGreaterThanOrEqual(96);
    expect(caps2DisplayAccuracy(85)).toBeGreaterThanOrEqual(85);
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
  it("scores from the same numbers shown in the move breakdown", () => {
    const white = counts({
      best: 21,
      book: 1,
      inaccuracy: 2,
      mistake: 1,
    });
    const black = counts({
      best: 12,
      excellent: 4,
      good: 3,
      book: 1,
      inaccuracy: 3,
      mistake: 2,
    });
    const w = accuracyFromClassificationCounts(white);
    const b = accuracyFromClassificationCounts(black);
    expect(w).toBeGreaterThan(b);
    expect(w).toBeGreaterThanOrEqual(96);
    expect(b).toBeLessThan(w);
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


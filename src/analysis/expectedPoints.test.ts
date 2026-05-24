import { describe, expect, it } from "vitest";
import {
  expectedPointsFromCpWhite,
  expectedPointsLoss,
  winPercentFromCp,
} from "./expectedPoints";

describe("winPercentFromCp", () => {
  it("matches Chess.com logistic at 0cp", () => {
    expect(winPercentFromCp(0)).toBeCloseTo(50, 5);
  });

  it("caps mate as extreme cp", () => {
    expect(winPercentFromCp(10000)).toBeGreaterThan(99);
    expect(winPercentFromCp(-10000)).toBeLessThan(1);
  });
});

describe("expectedPointsLoss", () => {
  it("is zero when best equals played", () => {
    expect(expectedPointsLoss(0.6, 0.6)).toBe(0);
  });

  it("uses 0-1 scale", () => {
    const eBefore = expectedPointsFromCpWhite(200, "w");
    const eAfter = expectedPointsFromCpWhite(0, "w");
    expect(expectedPointsLoss(eBefore, eAfter)).toBeGreaterThan(0.15);
  });
});

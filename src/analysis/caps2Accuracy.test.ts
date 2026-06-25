import { describe, expect, it } from "vitest";
import {
  caps2GameAccuracy,
  moveAccuracyFromEpLoss,
} from "./caps2Accuracy";

describe("caps2Accuracy", () => {
  it("scores perfect moves at 100", () => {
    expect(moveAccuracyFromEpLoss(0)).toBe(100);
  });

  it("applies CAPS2 curve with +1 bonus on imperfect moves", () => {
    const loss = moveAccuracyFromEpLoss(0.05);
    expect(loss).toBeGreaterThan(80);
    expect(loss).toBeLessThan(92);
  });

  it("weights blunders heavily via harmonic blend", () => {
    const clean = caps2GameAccuracy(Array(18).fill(0.01));
    const withBlunder = caps2GameAccuracy([
      ...Array(17).fill(0.01),
      0.25,
    ]);
    expect(clean - withBlunder).toBeGreaterThan(5);
  });
});

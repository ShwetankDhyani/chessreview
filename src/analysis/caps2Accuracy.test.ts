import { describe, expect, it } from "vitest";
import {
  gameAccuracyFromMoveScores,
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

  it("penalizes volatile games via standard deviation", () => {
    const steady = gameAccuracyFromMoveScores(Array(18).fill(88));
    const volatile = gameAccuracyFromMoveScores([
      ...Array(17).fill(92),
      25,
    ]);
    expect(steady).toBeGreaterThan(volatile);
    expect(steady - volatile).toBeGreaterThan(3);
  });
});

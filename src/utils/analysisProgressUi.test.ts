import { describe, expect, it } from "vitest";
import { computePredictedProgress, formatEtaGuess } from "./analysisProgressUi";

describe("analysisProgressUi", () => {
  it("advances percent with elapsed time even when engine progress is low", () => {
    const first = computePredictedProgress({
      elapsedMs: 0,
      predictedMs: 30_000,
      rawPercent: 2,
      prevDisplay: 2,
    });
    const mid = computePredictedProgress({
      elapsedMs: 15_000,
      predictedMs: first.predictedMs,
      rawPercent: 5,
      prevDisplay: first.display,
    });
    expect(mid.display).toBeGreaterThan(35);
    expect(mid.display).toBeLessThan(70);
  });

  it("extends the estimate when review runs past prediction", () => {
    const late = computePredictedProgress({
      elapsedMs: 28_000,
      predictedMs: 25_000,
      rawPercent: 90,
      prevDisplay: 80,
    });
    expect(late.predictedMs).toBeGreaterThan(25_000);
    expect(late.display).toBeGreaterThan(80);
  });

  it("formats ETA as a rough estimate, not exact", () => {
    expect(formatEtaGuess(47)).toMatch(/estimate/i);
    expect(formatEtaGuess(47)).not.toMatch(/47s/);
    expect(formatEtaGuess(95)).toMatch(/min/i);
  });
});

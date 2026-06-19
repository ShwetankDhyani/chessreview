import { describe, expect, it } from "vitest";
import {
  buildTimingModel,
  formulaFallbackDurationMs,
  mergeTimingModels,
  predictReviewDurationMs,
  type LocalTimingSample,
} from "./reviewTiming";

function sample(
  plies: number,
  depth: number,
  durationMs: number
): LocalTimingSample {
  return { plies, depth, durationMs, recordedAt: Date.now() };
}

describe("reviewTiming", () => {
  it("falls back to formula with no history", () => {
    const formula = formulaFallbackDurationMs(40, 12);
    expect(predictReviewDurationMs(40, 12, null)).toBe(formula);
  });

  it("learns median duration per depth and ply bucket", () => {
    const samples = [
      ...Array.from({ length: 5 }, () => sample(22, 12, 24_000)),
      ...Array.from({ length: 5 }, () => sample(22, 12, 26_000)),
      ...Array.from({ length: 4 }, () => sample(40, 12, 38_000)),
    ];
    const model = buildTimingModel(samples);
    expect(
      model.byDepthPly.some((b) => b.depth === 12 && b.pliesMin === 16)
    ).toBe(true);
    const predicted = predictReviewDurationMs(22, 12, model);
    expect(predicted).toBeGreaterThan(17_000);
    expect(predicted).toBeLessThan(32_000);
  });

  it("merges local samples over server aggregates for the same depth", () => {
    const server = buildTimingModel(
      Array.from({ length: 8 }, () => sample(30, 12, 40_000))
    );
    const local = buildTimingModel(
      Array.from({ length: 6 }, () => sample(30, 12, 20_000))
    );
    const merged = mergeTimingModels(server, local);
    const predicted = predictReviewDurationMs(30, 12, merged);
    expect(predicted).toBeLessThan(35_000);
    expect(predicted).toBeGreaterThan(18_000);
  });

  it("builds a model from a single fresh sample", () => {
    const model = buildTimingModel([sample(18, 14, 19_500)]);
    expect(model.sampleCount).toBe(1);
    expect(model.global?.medianMsPerPly).toBeGreaterThan(0);
  });
});

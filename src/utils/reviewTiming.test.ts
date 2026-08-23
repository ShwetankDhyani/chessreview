import { describe, expect, it } from "vitest";
import {
  buildTimingModel,
  formulaFallbackDurationMs,
  mergeTimingModels,
  predictReviewDurationMs,
  TIMING_ERA_START_MS,
  type LocalTimingSample,
} from "./reviewTiming";

function sample(
  plies: number,
  depth: number,
  durationMs: number,
  recordedAt = Date.now()
): LocalTimingSample {
  return { plies, depth, durationMs, recordedAt };
}

describe("reviewTiming", () => {
  it("falls back to formula with no history", () => {
    const formula = formulaFallbackDurationMs(40, 12);
    expect(predictReviewDurationMs(40, 12, null)).toBe(formula);
  });

  it("uses a parallel-era formula much faster than the old ~2min medians", () => {
    const ms = formulaFallbackDurationMs(40, 14);
    expect(ms).toBeLessThan(45_000);
    expect(ms).toBeGreaterThan(3_000);
  });

  it("ignores pre-era local samples", () => {
    const model = buildTimingModel([
      sample(40, 14, 120_000, TIMING_ERA_START_MS - 60_000),
      sample(40, 14, 120_000, TIMING_ERA_START_MS - 1),
    ]);
    expect(model.sampleCount).toBe(0);
    expect(predictReviewDurationMs(40, 14, model)).toBe(
      formulaFallbackDurationMs(40, 14)
    );
  });

  it("learns median duration per depth and ply bucket from era samples", () => {
    const now = Date.now();
    const samples = [
      ...Array.from({ length: 5 }, () => sample(22, 12, 8_000, now)),
      ...Array.from({ length: 5 }, () => sample(22, 12, 9_000, now)),
      ...Array.from({ length: 4 }, () => sample(40, 12, 14_000, now)),
    ];
    const model = buildTimingModel(samples);
    expect(
      model.byDepthPly.some((b) => b.depth === 12 && b.pliesMin === 16)
    ).toBe(true);
    const predicted = predictReviewDurationMs(22, 12, model);
    expect(predicted).toBeGreaterThan(5_000);
    expect(predicted).toBeLessThan(16_000);
  });

  it("merges local samples over server aggregates for the same depth", () => {
    const now = Date.now();
    const server = buildTimingModel(
      Array.from({ length: 8 }, () => sample(30, 12, 20_000, now))
    );
    const local = buildTimingModel(
      Array.from({ length: 6 }, () => sample(30, 12, 8_000, now))
    );
    const merged = mergeTimingModels(server, local);
    const predicted = predictReviewDurationMs(30, 12, merged);
    expect(predicted).toBeLessThan(18_000);
    expect(predicted).toBeGreaterThan(6_000);
  });

  it("builds a model from a single fresh sample", () => {
    const model = buildTimingModel([sample(18, 14, 7_500)]);
    expect(model.sampleCount).toBe(1);
    expect(model.global?.medianMsPerPly).toBeGreaterThan(0);
  });
});

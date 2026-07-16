import { describe, expect, it } from "vitest";
import { batchCacheIsUsable, evalResultToPositionAnalysis } from "./evalCache";
import type { PositionAnalysis } from "./types";

describe("batchCacheIsUsable", () => {
  it("requires 100% coverage (no 85% shortcut)", () => {
    const cache = new Map<string, PositionAnalysis>();
    cache.set(
      "a",
      evalResultToPositionAnalysis("a", {
        cp: 0,
        depth: 16,
        source: "local",
      })
    );
    expect(batchCacheIsUsable(cache, ["a", "b"])).toBe(false);
    cache.set(
      "b",
      evalResultToPositionAnalysis("b", {
        cp: 10,
        depth: 16,
        source: "local",
      })
    );
    expect(batchCacheIsUsable(cache, ["a", "b"])).toBe(true);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  countCachedReviews,
  recordReviewCompletion,
} from "./reviewCache";
import { resetSafeStorageForTests, safeSetItem } from "./safeStorage";

function installWindow(localStorage: unknown) {
  vi.stubGlobal("window", localStorage === undefined ? {} : { localStorage });
  resetSafeStorageForTests();
}

function workingStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

beforeEach(() => {
  installWindow(workingStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetSafeStorageForTests();
});

describe("review completion count", () => {
  it("starts at zero with empty storage", () => {
    expect(countCachedReviews()).toBe(0);
  });

  it("increments on each completed review", () => {
    recordReviewCompletion();
    recordReviewCompletion();
    expect(countCachedReviews()).toBe(2);
  });

  it("falls back to cached result records when the counter is absent", () => {
    safeSetItem(
      "cr_saved_reviews_v1",
      JSON.stringify([
        { key: "local:guest:habc", savedAt: 1, result: { moves: [] } },
        { key: "local:guest:hdef", savedAt: 2, result: { moves: [] } },
      ])
    );
    expect(countCachedReviews()).toBe(2);
  });

  it("falls back to local timing samples from earlier sessions", () => {
    safeSetItem(
      "cr_review_timing_v1",
      JSON.stringify([
        { plies: 40, depth: 14, durationMs: 12_000, recordedAt: 1 },
        { plies: 32, depth: 14, durationMs: 9_000, recordedAt: 2 },
        { plies: 28, depth: 12, durationMs: 8_000, recordedAt: 3 },
      ])
    );
    expect(countCachedReviews()).toBe(3);
  });
});

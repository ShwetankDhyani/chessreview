import { beforeEach, describe, expect, it } from "vitest";
import {
  clearCachedReviewsForProfile,
  loadSavedReview,
  saveReview,
} from "./reviewCache";
import type { ReviewResult } from "../types";

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  (globalThis as any).localStorage = {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => {
      storage.set(k, v);
    },
    removeItem: (k: string) => {
      storage.delete(k);
    },
  };
});

function stubResult(): ReviewResult {
  return {
    moves: [],
    summary: {
      accuracyWhite: 50,
      accuracyBlack: 50,
      estimatedEloWhite: 1200,
      estimatedEloBlack: 1200,
      moveCounts: {
        brilliant: 0,
        great: 0,
        best: 0,
        excellent: 0,
        good: 0,
        book: 0,
        inaccuracy: 0,
        mistake: 0,
        blunder: 0,
        miss: 0,
      },
    } as ReviewResult["summary"],
    run: null as unknown as ReviewResult["run"],
  };
}

describe("clearCachedReviewsForProfile", () => {
  it("removes only that profile's cached reviews", () => {
    const a = { name: "Alice", platform: "chesscom" as const };
    const b = { name: "Bob", platform: "lichess" as const };
    const result = stubResult();

    saveReview(a, "1. e4 e5", result);
    saveReview(b, "1. d4 d5", result);

    expect(loadSavedReview(a, "1. e4 e5")).not.toBeNull();
    expect(loadSavedReview(b, "1. d4 d5")).not.toBeNull();

    clearCachedReviewsForProfile(a);

    expect(loadSavedReview(a, "1. e4 e5")).toBeNull();
    expect(loadSavedReview(b, "1. d4 d5")).not.toBeNull();
  });
});

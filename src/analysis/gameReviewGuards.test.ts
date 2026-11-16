import { describe, expect, it } from "vitest";
import { analyzeGameReview, MAX_REVIEW_PLIES } from "./gameReview";

/**
 * These cases must fail before any engine work starts, so the test needs no
 * worker or network. A malformed PGN previously threw a raw chess.js error
 * from deep inside the pipeline.
 */
describe("analyzeGameReview input guards", () => {
  it("rejects a PGN it cannot parse with a clear message", async () => {
    await expect(
      analyzeGameReview("this is not a chess game at all {{{")
    ).rejects.toThrow(/invalid pgn/i);
  });

  it("rejects a PGN containing no moves", async () => {
    await expect(
      analyzeGameReview('[Event "Empty"]\n[Result "*"]\n\n*')
    ).rejects.toThrow(/invalid pgn/i);
  });

  it("rejects an empty string", async () => {
    await expect(analyzeGameReview("")).rejects.toThrow(/invalid pgn/i);
  });

  it("caps how many plies a single review will cover", () => {
    // Cost grows linearly with length, so a correspondence game with thousands
    // of plies would otherwise never finish in a browser session.
    expect(MAX_REVIEW_PLIES).toBeGreaterThan(100);
    expect(MAX_REVIEW_PLIES).toBeLessThanOrEqual(1000);
  });

  it("completes review on a game ending in checkmate and reaches 100% progress without hanging", async () => {
    const pgn = "1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0";
    const progress: number[] = [];
    const review = await analyzeGameReview(pgn, {
      onProgress: (done) => {
        progress.push(done);
      },
    });
    expect(review.moves.length).toBe(7);
    expect(review.moves[6].san).toBe("Qxf7#");
    expect(review.moves[6].classification).toBe("best");
    expect(progress).toContain(100);
    expect(progress[progress.length - 1]).toBe(100);
  });
});

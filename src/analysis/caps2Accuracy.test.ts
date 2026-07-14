import { describe, expect, it } from "vitest";
import type { AnalyzedMove } from "../types";
import {
  caps2AccuracyForMoves,
  caps2GameAccuracy,
  moveAccuracyFromEpLoss,
} from "./caps2Accuracy";

function move(
  partial: Partial<AnalyzedMove> & Pick<AnalyzedMove, "color" | "classification">
): AnalyzedMove {
  return {
    moveNumber: 1,
    san: "e4",
    uci: "e2e4",
    fenBefore: "",
    fenAfter: "",
    evalBefore: null,
    evalAfter: null,
    eBest: 0.5,
    eActual: 0.5,
    deltaE: 0,
    epLoss: 0,
    ...partial,
  };
}

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

  it("includes book and forced plies as perfect moves", () => {
    const withTheory = caps2AccuracyForMoves(
      [
        move({ color: "w", classification: "book", epLoss: 0 }),
        move({ color: "w", classification: "book", epLoss: 0 }),
        move({ color: "w", classification: "best", epLoss: 0 }),
        move({ color: "w", classification: "blunder", epLoss: 0.25 }),
      ],
      "w"
    );
    const withoutTheory = caps2AccuracyForMoves(
      [
        move({ color: "w", classification: "best", epLoss: 0 }),
        move({ color: "w", classification: "blunder", epLoss: 0.25 }),
      ],
      "w"
    );
    // Counting book as perfect should raise accuracy vs grading only post-book.
    expect(withTheory).toBeGreaterThan(withoutTheory);
  });

  it("can exclude book and forced from the average", () => {
    const included = caps2AccuracyForMoves(
      [
        move({ color: "w", classification: "book", epLoss: 0 }),
        move({ color: "w", classification: "blunder", epLoss: 0.25 }),
      ],
      "w",
      { excludeBookAndForced: false }
    );
    const excluded = caps2AccuracyForMoves(
      [
        move({ color: "w", classification: "book", epLoss: 0 }),
        move({ color: "w", classification: "blunder", epLoss: 0.25 }),
      ],
      "w",
      { excludeBookAndForced: true }
    );
    expect(excluded).toBeLessThan(included);
  });
});

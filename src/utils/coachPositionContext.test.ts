import { describe, expect, it } from "vitest";
import type { AnalyzedMove } from "../types";
import { getPositionAwareMoveComment } from "./coachPositionContext";

function move(
  partial: Partial<AnalyzedMove> & Pick<AnalyzedMove, "san" | "classification">
): AnalyzedMove {
  return {
    moveNumber: 10,
    color: "w",
    fenAfter: "",
    uci: "e2e4",
    bestMove: "d2d4",
    bestMoveSan: "d4",
    deltaE: 0,
    ...partial,
  } as AnalyzedMove;
}

describe("getPositionAwareMoveComment", () => {
  it("returns factual blunder copy without false encouragement", () => {
    const m = move({
      san: "Ke2",
      classification: "blunder",
      color: "w",
      evalBefore: { cp: -600, depth: 12, source: "local" },
      evalAfter: { cp: -900, depth: 12, source: "local" },
      deltaE: 0.25,
      engineLineCount: 3,
      engineRank: null,
    });
    const text = getPositionAwareMoveComment(m, 5);
    expect(text).toMatch(/Blunder/);
    expect(text).toMatch(/Best: d4/);
    expect(text).not.toMatch(/great job|right track|on the right track|keep fighting/i);
  });

  it("notes win chance swing when throwing away a win", () => {
    const m = move({
      san: "Qf2",
      classification: "blunder",
      color: "w",
      evalBefore: { cp: 500, depth: 12, source: "local" },
      evalAfter: { cp: 100, depth: 12, source: "local" },
      deltaE: 0.2,
      engineLineCount: 3,
    });
    const text = getPositionAwareMoveComment(m, 7);
    expect(text).toMatch(/Blunder/);
    expect(text).toMatch(/Win/);
  });
});

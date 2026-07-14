import { describe, expect, it } from "vitest";
import type { AnalyzedMove } from "../types";
import { pickCriticalMoments } from "./criticalMoments";

function move(
  partial: Partial<AnalyzedMove> &
    Pick<AnalyzedMove, "san" | "classification" | "moveNumber" | "color">
): AnalyzedMove {
  return {
    fenBefore: "",
    fenAfter: "",
    uci: "e2e4",
    eBest: 0.5,
    eActual: 0.5,
    deltaE: 0,
    evalBefore: null,
    evalAfter: null,
    ...partial,
  };
}

describe("pickCriticalMoments", () => {
  it("surfaces big swings and severity highlights", () => {
    const moves = [
      move({
        san: "e4",
        classification: "book",
        moveNumber: 1,
        color: "w",
        eBefore: 0.5,
        eActual: 0.52,
      }),
      move({
        san: "Ke2",
        classification: "blunder",
        moveNumber: 20,
        color: "w",
        eBefore: 0.8,
        eActual: 0.35,
      }),
      move({
        san: "Nf3",
        classification: "best",
        moveNumber: 21,
        color: "b",
        eBefore: 0.5,
        eActual: 0.51,
      }),
      move({
        san: "Qh5",
        classification: "miss",
        moveNumber: 22,
        color: "w",
        eBefore: 0.7,
        eActual: 0.4,
      }),
    ];
    const moments = pickCriticalMoments(moves, 4);
    expect(moments.map((m) => m.move.san)).toEqual(["Ke2", "Qh5"]);
  });
});

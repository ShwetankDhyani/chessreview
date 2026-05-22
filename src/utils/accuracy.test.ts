import { describe, expect, it } from "vitest";
import type { AnalyzedMove } from "../types";
import { caps2DisplayAccuracy, computePlayerAccuracy } from "./accuracy";

function move(
  partial: Partial<AnalyzedMove> & Pick<AnalyzedMove, "color" | "classification">
): AnalyzedMove {
  return {
    moveNumber: 1,
    san: "e4",
    uci: "e2e4",
    fenBefore: "",
    fenAfter: "fen",
    evalBefore: { cp: 0, depth: 12, source: "server" },
    evalAfter: { cp: 0, depth: 12, source: "server" },
    epLoss: 0.004,
    deltaE: 0,
    bestMove: "e2e4",
    ...partial,
  } as AnalyzedMove;
}

describe("caps2DisplayAccuracy", () => {
  it("preserves near-perfect raw scores up to 99.9", () => {
    expect(caps2DisplayAccuracy(97)).toBeGreaterThanOrEqual(99);
    expect(caps2DisplayAccuracy(97)).toBeLessThanOrEqual(99.9);
  });

  it("does not crush high raw scores to the low 80s", () => {
    expect(caps2DisplayAccuracy(97)).toBeGreaterThan(90);
  });
});

describe("computePlayerAccuracy", () => {
  it("includes book moves as 100% like Chess.com", () => {
    const moves: AnalyzedMove[] = [
      move({ color: "b", classification: "book", san: "c5", epLoss: 0.002 }),
      move({ color: "b", classification: "book", san: "Nc6", epLoss: 0.003 }),
      move({ color: "b", classification: "best", san: "Nf6", epLoss: 0.004 }),
      move({ color: "w", classification: "best", san: "d4", epLoss: 0.004 }),
    ];
    const cpMap = new Map(moves.map((m) => [m.fenAfter, 0]));
    const result = computePlayerAccuracy(moves, "b", cpMap, () => "opening");
    expect(result.game).toBeGreaterThanOrEqual(99);
  });

  it("matches Chess.com-style ~99% for mostly-best games with book moves", () => {
    const blackMoves: AnalyzedMove[] = [
      ...Array(2).fill(null).map((_, i) =>
        move({
          color: "b",
          classification: "book",
          san: i === 0 ? "c5" : "Nc6",
          epLoss: 0.002,
        })
      ),
      ...Array(11).fill(null).map((_, i) =>
        move({
          color: "b",
          classification: "best",
          san: `m${i}`,
          epLoss: 0.004,
        })
      ),
      move({ color: "b", classification: "good", san: "Qg4", epLoss: 0.06 }),
    ];
    const cpMap = new Map(blackMoves.map((m) => [m.fenAfter, 0]));
    const result = computePlayerAccuracy(blackMoves, "b", cpMap, () => "middlegame");
    expect(result.game).toBeGreaterThanOrEqual(98);
    expect(result.game).toBeLessThanOrEqual(99.9);
  });
});

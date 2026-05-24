import { describe, expect, it } from "vitest";
import type { AnalyzedMove } from "../types";
import {
  caps2DisplayAccuracy,
  computePlayerAccuracy,
  effectiveEpLossForAccuracy,
  moverWinChance,
} from "./accuracy";

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
    expect(caps2DisplayAccuracy(96)).toBeGreaterThanOrEqual(96);
    expect(caps2DisplayAccuracy(85)).toBeGreaterThanOrEqual(85);
  });
});

describe("effectiveEpLossForAccuracy", () => {
  it("dampens losses when the player stays clearly winning", () => {
    const slip = move({
      color: "w",
      classification: "blunder",
      epLoss: 0.28,
      evalBefore: { cp: 900, depth: 14, source: "server" },
      evalAfter: { cp: 550, depth: 14, source: "server" },
    });
    expect(moverWinChance(slip, "before")).toBeGreaterThan(0.85);
    expect(moverWinChance(slip, "after")).toBeGreaterThan(0.7);
    expect(effectiveEpLossForAccuracy(slip)).toBeLessThan(0.1);
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

  it("keeps high game accuracy when one throwaway happens while still winning", () => {
    const whiteMoves: AnalyzedMove[] = [
      ...Array(10).fill(null).map((_, i) =>
        move({
          color: "w",
          classification: "best",
          san: `b${i}`,
          epLoss: 0.003,
          evalBefore: { cp: 400 + i * 20, depth: 14, source: "server" },
          evalAfter: { cp: 420 + i * 20, depth: 14, source: "server" },
        })
      ),
      move({
        color: "w",
        classification: "inaccuracy",
        san: "Rf1",
        epLoss: 0.22,
        evalBefore: { cp: 850, depth: 14, source: "server" },
        evalAfter: { cp: 520, depth: 14, source: "server" },
      }),
      ...Array(3).fill(null).map((_, i) =>
        move({
          color: "w",
          classification: "best",
          san: `e${i}`,
          epLoss: 0.004,
          evalBefore: { cp: 600, depth: 14, source: "server" },
          evalAfter: { cp: 620, depth: 14, source: "server" },
        })
      ),
    ];
    const cpMap = new Map(whiteMoves.map((m) => [m.fenAfter, m.evalAfter!.cp!]));
    const result = computePlayerAccuracy(whiteMoves, "w", cpMap, () => "middlegame");
    expect(result.game).toBeGreaterThanOrEqual(88);
    expect(result.phase.middlegame).toBeGreaterThanOrEqual(80);
  });

  it("rates the cleaner move chart higher (more best, fewer errors)", () => {
    const cp = { depth: 14, source: "server" as const };
    const whiteMoves: AnalyzedMove[] = [
      ...Array(21).fill(null).map((_, i) =>
        move({
          color: "w",
          classification: "best",
          san: `wb${i}`,
          epLoss: 0.004,
          evalBefore: { cp: 300, ...cp },
          evalAfter: { cp: 320, ...cp },
        })
      ),
      ...Array(2).fill(null).map((_, i) =>
        move({
          color: "w",
          classification: "inaccuracy",
          san: `wi${i}`,
          epLoss: 0.09,
          evalBefore: { cp: 400, ...cp },
          evalAfter: { cp: 350, ...cp },
        })
      ),
      move({
        color: "w",
        classification: "mistake",
        san: "Wm",
        epLoss: 0.16,
        evalBefore: { cp: 500, ...cp },
        evalAfter: { cp: 380, ...cp },
      }),
      move({
        color: "w",
        classification: "book",
        san: "e4",
        epLoss: 0.002,
        evalBefore: { cp: 20, ...cp },
        evalAfter: { cp: 25, ...cp },
      }),
    ];
    const blackMoves: AnalyzedMove[] = [
      ...Array(12).fill(null).map((_, i) =>
        move({
          color: "b",
          classification: "best",
          san: `bb${i}`,
          epLoss: 0.004,
          evalBefore: { cp: -200, ...cp },
          evalAfter: { cp: -220, ...cp },
        })
      ),
      ...Array(4).fill(null).map((_, i) =>
        move({
          color: "b",
          classification: "excellent",
          san: `be${i}`,
          epLoss: 0.015,
          evalBefore: { cp: -180, ...cp },
          evalAfter: { cp: -200, ...cp },
        })
      ),
      ...Array(3).fill(null).map((_, i) =>
        move({
          color: "b",
          classification: "good",
          san: `bg${i}`,
          epLoss: 0.04,
          evalBefore: { cp: -150, ...cp },
          evalAfter: { cp: -170, ...cp },
        })
      ),
      ...Array(3).fill(null).map((_, i) =>
        move({
          color: "b",
          classification: "inaccuracy",
          san: `bi${i}`,
          epLoss: 0.09,
          evalBefore: { cp: -120, ...cp },
          evalAfter: { cp: -160, ...cp },
        })
      ),
      ...Array(2).fill(null).map((_, i) =>
        move({
          color: "b",
          classification: "mistake",
          san: `bm${i}`,
          epLoss: 0.16,
          evalBefore: { cp: -80, ...cp },
          evalAfter: { cp: -140, ...cp },
        })
      ),
      move({
        color: "b",
        classification: "book",
        san: "e5",
        epLoss: 0.002,
        evalBefore: { cp: -15, ...cp },
        evalAfter: { cp: -20, ...cp },
      }),
    ];
    const all = [...whiteMoves, ...blackMoves];
    const cpMap = new Map(all.map((m) => [m.fenAfter, m.evalAfter!.cp!]));
    const w = computePlayerAccuracy(all, "w", cpMap, () => "middlegame");
    const b = computePlayerAccuracy(all, "b", cpMap, () => "middlegame");
    expect(w.game).toBeGreaterThan(b.game);
    expect(w.game).toBeGreaterThanOrEqual(94);
    expect(b.game).toBeLessThan(w.game);
    expect(b.game).toBeLessThan(96);
  });
});

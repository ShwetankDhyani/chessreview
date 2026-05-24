import { describe, expect, it, vi } from "vitest";
import type { EvalResult } from "../types";

vi.mock("../engine/evaluationService", () => ({
  evaluateFensConsensus: vi.fn(
    async (
      fens: string[],
      policy: { requestedDepth: number },
      onProgress?: (done: number, total: number) => void
    ) => {
      onProgress?.(fens.length, fens.length);
      const evals = new Map<string, EvalResult>();
      fens.forEach((fen, i) => {
        evals.set(fen, {
          cp: i * 8,
          depth: policy.requestedDepth,
          source: "local",
          verified: true,
          confidence: 0.95,
        });
      });
      return {
        evals,
        meta: {
          evaluated: fens.length,
          deepened: 0,
          verified: fens.length,
        },
      };
    }
  ),
}));

import { analyzePgn } from "./analyzer";

const SIMPLE_PGN = `
[Event "Test"]
[Site "?"]
[Date "2026.05.24"]
[Round "-"]
[White "White"]
[Black "Black"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 1-0
`;

describe("analyzePgn", () => {
  it("is deterministic for same PGN and depth", async () => {
    const a = await analyzePgn(SIMPLE_PGN, undefined, 14);
    const b = await analyzePgn(SIMPLE_PGN, undefined, 14);
    expect(a.summary.accuracy).toEqual(b.summary.accuracy);
    expect(a.summary.phaseAccuracy).toEqual(b.summary.phaseAccuracy);
    expect(a.moves.map((m) => m.classification)).toEqual(
      b.moves.map((m) => m.classification)
    );
  });

  it("keeps coverage/count denominator consistent", async () => {
    const result = await analyzePgn(SIMPLE_PGN, undefined, 14);
    const totalCounted =
      Object.values(result.summary.white).reduce((a, b) => a + b, 0) +
      Object.values(result.summary.black).reduce((a, b) => a + b, 0);
    expect(result.summary.coverage).toBeTruthy();
    expect(result.summary.coverage!.classifiedPlies).toBe(totalCounted);
    expect(result.summary.coverage!.totalPlies).toBe(result.moves.length);
  });
});

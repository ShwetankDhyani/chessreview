import { describe, expect, it, vi } from "vitest";
import type { ReviewResult } from "../types";

const mockReview: ReviewResult = {
  run: {
    runId: "test",
    engineVersion: "mock",
    startedAt: "2026-01-01T00:00:00.000Z",
    finishedAt: "2026-01-01T00:00:01.000Z",
    requestedDepth: 18,
    fastDepth: 18,
    deepDepth: 18,
    backendPolicy: "consensus",
    pgnHash: "h1",
  },
  moves: [
    {
      moveNumber: 1,
      color: "w",
      san: "e4",
      uci: "e2e4",
      fenBefore: "",
      fenAfter: "",
      evalBefore: { cp: 30, depth: 18, source: "local" },
      evalAfter: { cp: 28, depth: 18, source: "local" },
      eBest: 0.3,
      eActual: 0.28,
      deltaE: 0.02,
      epLoss: 0.01,
      classification: "excellent",
    },
  ],
  summary: {
    white: {
      brilliant: 0,
      great: 0,
      best: 0,
      excellent: 1,
      good: 0,
      book: 0,
      inaccuracy: 0,
      mistake: 0,
      miss: 0,
      blunder: 0,
    },
    black: {
      brilliant: 0,
      great: 0,
      best: 0,
      excellent: 0,
      good: 0,
      book: 0,
      inaccuracy: 0,
      mistake: 0,
      miss: 0,
      blunder: 0,
    },
    accuracy: { white: 90, black: 0 },
    accuracyMeta: {
      method: "chesscom_ep_v3",
      formulaVersion: "v3.2-wdl-hybrid-batch",
    },
  },
};

vi.mock("../analysis/gameReview", () => ({
  analyzeGameReview: vi.fn(async () => mockReview),
}));

import { analyzePgn } from "./analyzer";

const SIMPLE_PGN = `
[Event "Test"]
1. e4 e5 2. Nf3 Nc6 1-0
`;

describe("analyzePgn", () => {
  it("delegates to Chess.com-style game review module", async () => {
    const result = await analyzePgn(SIMPLE_PGN, undefined, 18);
    expect(result.summary.accuracyMeta?.formulaVersion).toMatch(/v3\.2/);
    expect(result.moves.length).toBeGreaterThan(0);
  });
});

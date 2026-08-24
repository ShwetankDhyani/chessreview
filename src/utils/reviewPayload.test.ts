import { describe, expect, it } from "vitest";
import {
  InvalidReviewPayloadError,
  normalizeAnalyzedMoves,
  normalizeCachedGames,
  normalizeReviewPayload,
  normalizeReviewSummary,
} from "./reviewPayload";

function validMove(overrides: Record<string, unknown> = {}) {
  return {
    moveNumber: 1,
    color: "w",
    san: "e4",
    uci: "e2e4",
    fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
    evalBefore: { cp: 20, depth: 18 },
    evalAfter: { cp: 30, depth: 18 },
    eBest: 0.55,
    eActual: 0.54,
    deltaE: 0.01,
    classification: "best",
    ...overrides,
  };
}

describe("normalizeReviewSummary", () => {
  it("always produces a readable accuracy pair", () => {
    // The render path reads summary.accuracy.white without optional chaining.
    for (const input of [undefined, null, {}, { accuracy: null }, "nonsense"]) {
      const summary = normalizeReviewSummary(input);
      expect(typeof summary.accuracy.white).toBe("number");
      expect(typeof summary.accuracy.black).toBe("number");
    }
  });

  it("clamps accuracy into 0-100", () => {
    const summary = normalizeReviewSummary({
      accuracy: { white: 150, black: -20 },
    });
    expect(summary.accuracy.white).toBe(100);
    expect(summary.accuracy.black).toBe(0);
  });

  it("coerces non-finite accuracy to zero", () => {
    const summary = normalizeReviewSummary({
      accuracy: { white: "abc", black: NaN },
    });
    expect(summary.accuracy.white).toBe(0);
    expect(summary.accuracy.black).toBe(0);
  });

  it("fills every classification count", () => {
    const summary = normalizeReviewSummary({ white: { best: 3 } });
    expect(summary.white.best).toBe(3);
    expect(summary.white.blunder).toBe(0);
    expect(summary.black.brilliant).toBe(0);
  });

  it("keeps phase accuracy nullable rather than inventing numbers", () => {
    const summary = normalizeReviewSummary({
      phaseAccuracy: { opening: { white: 80, black: "x" } },
    });
    expect(summary.phaseAccuracy?.opening.white).toBe(80);
    expect(summary.phaseAccuracy?.opening.black).toBeNull();
    expect(summary.phaseAccuracy?.endgame.white).toBeNull();
  });

  it("drops an unrecognised accuracy method", () => {
    expect(
      normalizeReviewSummary({ accuracyMeta: { method: "made_up" } })
        .accuracyMeta
    ).toBeUndefined();
    expect(
      normalizeReviewSummary({
        accuracyMeta: { method: "lichess_caps2_v5", formulaVersion: "1" },
      }).accuracyMeta?.method
    ).toBe("lichess_caps2_v5");
  });
});

describe("normalizeAnalyzedMoves", () => {
  it("returns an empty array for non-array input", () => {
    for (const input of [null, undefined, {}, "moves", 7]) {
      expect(normalizeAnalyzedMoves(input)).toEqual([]);
    }
  });

  it("drops entries the board cannot replay", () => {
    const moves = normalizeAnalyzedMoves([
      validMove(),
      validMove({ san: "" }),
      validMove({ fenAfter: undefined }),
      null,
      "not a move",
    ]);
    expect(moves).toHaveLength(1);
  });

  it("repairs non-finite numeric fields", () => {
    const [move] = normalizeAnalyzedMoves([
      validMove({ eBest: "x", eActual: null, deltaE: NaN, moveNumber: "abc" }),
    ]);
    expect(move.eBest).toBe(0);
    expect(move.eActual).toBe(0);
    expect(move.deltaE).toBe(0);
    expect(Number.isFinite(move.moveNumber)).toBe(true);
  });

  it("falls back to a known classification", () => {
    const [move] = normalizeAnalyzedMoves([
      validMove({ classification: "spectacular" }),
    ]);
    expect(move.classification).toBe("good");
  });

  it("normalizes colour to w or b", () => {
    expect(normalizeAnalyzedMoves([validMove({ color: "x" })])[0].color).toBe("w");
    expect(normalizeAnalyzedMoves([validMove({ color: "b" })])[0].color).toBe("b");
  });
});

describe("normalizeReviewPayload", () => {
  it("accepts a well-formed payload", () => {
    const result = normalizeReviewPayload({
      moves: [validMove()],
      summary: { accuracy: { white: 90, black: 80 } },
    });
    expect(result.moves).toHaveLength(1);
    expect(result.summary.accuracy.white).toBe(90);
    expect(result.droppedMoves).toBe(0);
  });

  it("rebuilds a missing summary instead of throwing", () => {
    const result = normalizeReviewPayload({ moves: [validMove()] });
    expect(result.summary.accuracy.white).toBe(0);
  });

  it("reports how many entries were unusable", () => {
    const result = normalizeReviewPayload({
      moves: [validMove(), null, validMove({ san: "" })],
    });
    expect(result.moves).toHaveLength(1);
    expect(result.droppedMoves).toBe(2);
  });

  it("rejects payloads with nothing renderable", () => {
    for (const input of [null, undefined, "text", {}, { moves: [] }, { moves: [null] }]) {
      expect(() => normalizeReviewPayload(input)).toThrow(
        InvalidReviewPayloadError
      );
    }
  });
});

describe("normalizeCachedGames", () => {
  it("keeps only entries the list can render", () => {
    // Rows call .toLowerCase() on both player names during render.
    const games = normalizeCachedGames([
      { id: "1", pgn: "x", white: "a", black: "b" },
      { id: "2", pgn: "x", white: null, black: "b" },
      { id: "3", pgn: "x", black: "b" },
      null,
      "nope",
    ]);
    expect(games).toHaveLength(1);
    expect(games[0].id).toBe("1");
  });

  it("returns an empty array for non-array input", () => {
    for (const input of [null, undefined, {}, "games"]) {
      expect(normalizeCachedGames(input)).toEqual([]);
    }
  });
});

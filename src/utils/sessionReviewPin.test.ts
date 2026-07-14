import { describe, expect, it, beforeEach } from "vitest";
import type { ReviewResult } from "../types";
import {
  clearSessionReviewPin,
  getSessionReviewPin,
  jobFromPin,
  matchesReviewIdentity,
  resolveActiveReview,
  setSessionReviewPin,
  shouldSoftBrowseOtherGame,
  type SessionReviewPin,
} from "./sessionReviewPin";

const result = { moves: [], summary: null } as unknown as ReviewResult;

function pin(overrides: Partial<SessionReviewPin> = {}): SessionReviewPin {
  return {
    pgn: "1. e4 e5",
    label: "A vs B",
    gameId: "game-1",
    result,
    ...overrides,
  };
}

describe("sessionReviewPin", () => {
  beforeEach(() => {
    clearSessionReviewPin();
  });

  it("keeps the pin in module memory across get/set", () => {
    const p = pin();
    setSessionReviewPin(p);
    expect(getSessionReviewPin()).toEqual(p);
    clearSessionReviewPin();
    expect(getSessionReviewPin()).toBeNull();
  });

  it("matches by game id even when PGN whitespace differs", () => {
    expect(
      matchesReviewIdentity(
        { pgn: "1. e4  e5", gameId: "game-1" },
        { pgn: "1. e4 e5 *", gameId: "game-1" }
      )
    ).toBe(true);
  });

  it("matches by normalized PGN when game ids are missing", () => {
    expect(
      matchesReviewIdentity(
        { pgn: "1. e4 e5\n2. Nf3", gameId: null },
        { pgn: "1. e4 e5 2. Nf3", gameId: null }
      )
    ).toBe(true);
  });

  it("soft-browses while a finished pin exists", () => {
    expect(
      shouldSoftBrowseOtherGame({
        analysisRunning: false,
        reviewJob: null,
        pin: pin(),
      })
    ).toBe(true);
  });

  it("keeps a finished review active after browsing another board", () => {
    const p = pin();
    const active = resolveActiveReview({
      reviewJob: jobFromPin(p),
      analysisRunning: false,
      parkedResult: result,
      pin: p,
      progressPercent: 40,
      pgn: "1. d4 d5",
      analysisState: "loading",
      movesLength: 0,
      sessionGameId: "game-2",
      vsLabel: "C vs D",
    });
    expect(active).toEqual({
      gameId: "game-1",
      label: "A vs B",
      pgn: "1. e4 e5",
      running: false,
      done: true,
      progressPercent: 100,
    });
  });

  it("falls back to memory pin when job was cleared", () => {
    const p = pin();
    setSessionReviewPin(p);
    const active = resolveActiveReview({
      reviewJob: null,
      analysisRunning: false,
      parkedResult: null,
      pin: getSessionReviewPin(),
      progressPercent: 0,
      pgn: "1. d4 d5",
      analysisState: "loading",
      movesLength: 0,
      sessionGameId: "game-2",
      vsLabel: "C vs D",
    });
    expect(active?.done).toBe(true);
    expect(active?.gameId).toBe("game-1");
  });
});

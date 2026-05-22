import { describe, expect, it } from "vitest";
import type { AnalyzedMove, KeyMoment, ReviewSummary } from "../types";
import { buildReviewStory } from "./reviewStory";

function stubMove(
  idx: number,
  overrides: Partial<AnalyzedMove> & Pick<AnalyzedMove, "san" | "color" | "classification" | "deltaE">
): AnalyzedMove {
  return {
    moveNumber: Math.ceil((idx + 1) / 2),
    uci: "e2e4",
    fenBefore: "",
    fenAfter: "",
    eBest: 0,
    eActual: 0,
    evalBefore: overrides.evalBefore ?? { cp: 0, depth: 12, source: "local" },
    evalAfter: overrides.evalAfter ?? { cp: 0, depth: 12, source: "local" },
    ...overrides,
  } as AnalyzedMove;
}

function segmentText(lines: ReturnType<typeof buildReviewStory>["lines"]): string {
  return lines
    .flat()
    .map((s) => (s.kind === "text" ? s.value : s.kind === "move" ? s.label : s.name))
    .join("");
}

describe("buildReviewStory", () => {
  it("picks winner's decisive blunder over earlier opponent slip", () => {
    const earlyBc5: KeyMoment = {
      moveIdx: 14,
      san: "Bc5",
      moveNumber: 8,
      color: "b",
      classification: "mistake",
      swing: 1.5,
    };
    const lateNge2: KeyMoment = {
      moveIdx: 16,
      san: "Nge2",
      moveNumber: 9,
      color: "w",
      classification: "blunder",
      swing: 8.8,
    };

    const moves: AnalyzedMove[] = Array.from({ length: 20 }, (_, i) =>
      stubMove(i, {
        san: "e4",
        color: i % 2 === 0 ? "w" : "b",
        classification: "best",
        deltaE: 0.1,
      })
    );
    moves[14] = stubMove(14, {
      san: "Bc5",
      color: "b",
      classification: "mistake",
      deltaE: 1.5,
      evalBefore: { cp: 40, depth: 12, source: "local" },
      evalAfter: { cp: 260, depth: 12, source: "local" },
    });
    moves[16] = stubMove(16, {
      san: "Nge2",
      color: "w",
      classification: "blunder",
      deltaE: 8.8,
      evalBefore: { cp: 260, depth: 12, source: "local" },
      evalAfter: { cp: -620, depth: 12, source: "local" },
    });

    const summary: ReviewSummary = {
      white: {
        brilliant: 0,
        great: 0,
        best: 3,
        excellent: 1,
        good: 2,
        book: 0,
        inaccuracy: 1,
        mistake: 1,
        blunder: 1,
      },
      black: {
        brilliant: 0,
        great: 0,
        best: 2,
        excellent: 1,
        good: 0,
        book: 0,
        inaccuracy: 3,
        mistake: 2,
        blunder: 2,
      },
      accuracy: { white: 71.1, black: 54.5 },
      phaseAccuracy: {
        opening: { white: 81, black: 82 },
        middlegame: { white: 100, black: 24 },
        endgame: { white: 0, black: 0 },
      },
      keyMoments: [earlyBc5, lateNge2],
    };

    const story = buildReviewStory(
      summary,
      moves,
      "DrCarlss",
      "MrDhyani",
      "0-1"
    );
    const text = segmentText(story.lines);

    expect(text).toContain("MrDhyani");
    expect(text).toContain("won despite trailing on accuracy");
    expect(text).not.toContain("close game on accuracy");
    expect(text).toMatch(/9\.Nge2|9\.\.\.?Nge2|9\. Nge2/);
    expect(text).not.toMatch(/8\.\.\.?Bc5|8\. Bc5/);
  });

  it("does not call a wide accuracy gap a close fight", () => {
    const summary: ReviewSummary = {
      white: {
        brilliant: 0,
        great: 0,
        best: 5,
        excellent: 0,
        good: 0,
        book: 0,
        inaccuracy: 0,
        mistake: 0,
        blunder: 0,
      },
      black: {
        brilliant: 0,
        great: 0,
        best: 2,
        excellent: 0,
        good: 0,
        book: 0,
        inaccuracy: 2,
        mistake: 2,
        blunder: 2,
      },
      accuracy: { white: 72, black: 55 },
      keyMoments: [],
    };
    const moves = Array.from({ length: 12 }, (_, i) =>
      stubMove(i, {
        san: "e4",
        color: i % 2 === 0 ? "w" : "b",
        classification: "best",
        deltaE: 0.2,
      })
    );

    const text = segmentText(
      buildReviewStory(summary, moves, "White", "Black", "0-1").lines
    );
    expect(text.toLowerCase()).not.toContain("close game on accuracy");
  });
});

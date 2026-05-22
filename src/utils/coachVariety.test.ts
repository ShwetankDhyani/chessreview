import { describe, expect, it, beforeEach } from "vitest";
import {
  clearCoachPhraseMemory,
  isRoboticRepetition,
  pickVariedLine,
  phraseTemplate,
} from "./coachVariety";
import { COACH_BANNED_SUBSTRINGS } from "./coachPhraseBank";

describe("pickVariedLine", () => {
  beforeEach(() => clearCoachPhraseMemory());

  it("returns different templates across picks in one session", () => {
    const pool = [
      "e4 — top of the engine list.",
      "e4 — no flash, just the right reply.",
      "e4 — principled and punishing if they slip.",
      "e4 — you found the needle in a haystack.",
    ];
    const a = pickVariedLine(1, pool);
    const b = pickVariedLine(2, pool);
    const c = pickVariedLine(3, pool);
    const templates = new Set([a, b, c].map(phraseTemplate));
    expect(templates.size).toBe(3);
  });
});

describe("isRoboticRepetition", () => {
  it("flags banned clichés", () => {
    expect(
      isRoboticRepetition("Nf3 — clean and precise.", [], COACH_BANNED_SUBSTRINGS)
    ).toBe(true);
  });
});

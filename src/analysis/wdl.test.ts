import { describe, expect, it } from "vitest";
import { wdlTripleToWinProb, cpToWinProb } from "./wdl";

describe("wdl", () => {
  it("converts equal WDL to 0.5", () => {
    expect(wdlTripleToWinProb(333, 334, 333)).toBeCloseTo(0.5, 2);
  });

  it("values draws at half a win", () => {
    expect(wdlTripleToWinProb(0, 1000, 0)).toBeCloseTo(0.5, 3);
  });

  it("increases win probability with centipawn advantage", () => {
    const neutral = cpToWinProb(0, 58);
    const winning = cpToWinProb(200, 58);
    expect(winning).toBeGreaterThan(neutral);
  });
});

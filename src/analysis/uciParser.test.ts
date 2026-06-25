import { describe, expect, it } from "vitest";
import { parseInfoLine } from "./uciParser";

describe("uciParser", () => {
  it("parses cp score with WDL triple", () => {
    const line =
      "info depth 20 multipv 1 score cp 143 wdl 562 418 20 pv e2e4 e7e5 g1f3";
    const parsed = parseInfoLine(line);
    expect(parsed?.depth).toBe(20);
    expect(parsed?.scoreType).toBe("cp");
    expect(parsed?.scoreValue).toBe(143);
    expect(parsed?.wdl).toEqual({ w: 562, d: 418, l: 20 });
    expect(parsed?.move).toBe("e2e4");
  });

  it("parses mate scores", () => {
    const line = "info depth 18 score mate 3 pv e2e4";
    const parsed = parseInfoLine(line);
    expect(parsed?.scoreType).toBe("mate");
    expect(parsed?.scoreValue).toBe(3);
  });
});

import { describe, expect, it } from "vitest";
import { soundKindFromSan } from "./chessSounds";

describe("soundKindFromSan", () => {
  it("classifies move kinds", () => {
    expect(soundKindFromSan("e4")).toBe("move");
    expect(soundKindFromSan("Nxe5")).toBe("capture");
    expect(soundKindFromSan("O-O")).toBe("castle");
    expect(soundKindFromSan("O-O-O")).toBe("castle");
    expect(soundKindFromSan("e8=Q")).toBe("promote");
    expect(soundKindFromSan("Qh5+")).toBe("check");
    expect(soundKindFromSan("Qh5#")).toBe("check");
  });
});

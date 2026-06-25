import { describe, expect, it } from "vitest";
import { computeMobileBoardSize } from "./boardLayout";

describe("computeMobileBoardSize", () => {
  it("limits board height on typical phones to leave room for commentary", () => {
    const size = computeMobileBoardSize(390, 844, { evalGraphOpen: false });
    expect(size).toBeLessThan(390);
    expect(size).toBeGreaterThanOrEqual(240);
  });

  it("shrinks further when eval graph is expanded", () => {
    const closed = computeMobileBoardSize(390, 844, { evalGraphOpen: false });
    const open = computeMobileBoardSize(390, 844, { evalGraphOpen: true });
    expect(open).toBeLessThan(closed);
  });
});

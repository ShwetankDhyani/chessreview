import { describe, expect, it } from "vitest";
import { computeMobileBoardSize } from "./boardLayout";

describe("computeMobileBoardSize", () => {
  it("gives a large board on typical phones while leaving coach room", () => {
    const size = computeMobileBoardSize(390, 844, { evalGraphOpen: false });
    expect(size).toBeLessThanOrEqual(390 - 8 - 20);
    expect(size).toBeGreaterThanOrEqual(300);
  });

  it("shrinks further when eval graph is expanded", () => {
    const closed = computeMobileBoardSize(390, 844, { evalGraphOpen: false });
    const open = computeMobileBoardSize(390, 844, { evalGraphOpen: true });
    expect(open).toBeLessThan(closed);
  });
});

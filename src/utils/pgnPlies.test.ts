import { describe, expect, it } from "vitest";
import {
  formatChessMoveCounter,
  plyIndexToFullMoveNumber,
  totalFullMovesFromPlyCount,
} from "./pgnPlies";

describe("chess full move numbers", () => {
  it("maps ply index to full move", () => {
    expect(plyIndexToFullMoveNumber(-1)).toBe(null);
    expect(plyIndexToFullMoveNumber(0)).toBe(1);
    expect(plyIndexToFullMoveNumber(1)).toBe(1);
    expect(plyIndexToFullMoveNumber(2)).toBe(2);
    expect(plyIndexToFullMoveNumber(34)).toBe(18);
  });

  it("counts total full moves from plies", () => {
    expect(totalFullMovesFromPlyCount(0)).toBe(0);
    expect(totalFullMovesFromPlyCount(62)).toBe(31);
    expect(totalFullMovesFromPlyCount(61)).toBe(31);
  });

  it("formats counter for display", () => {
    expect(formatChessMoveCounter(-1, 62)).toBe("Start / 31");
    expect(formatChessMoveCounter(34, 62)).toBe("18 / 31");
    expect(formatChessMoveCounter(0, 4)).toBe("1 / 2");
  });
});

import { describe, expect, it } from "vitest";
import {
  formatSignedMate,
  formatSignedPawnsFromCp,
  formatWinChanceLoss,
  winChanceLossPercent,
} from "./evalDisplay";

describe("evalDisplay", () => {
  it("formats win chance loss from expected points", () => {
    expect(winChanceLossPercent(0.2)).toBe(20);
    expect(formatWinChanceLoss(0.2)).toBe("−20% win chance");
    expect(formatWinChanceLoss(0.005)).toBeNull();
  });

  it("formats signed pawn eval from white POV", () => {
    expect(formatSignedPawnsFromCp(130)).toBe("+1.3");
    expect(formatSignedPawnsFromCp(-85)).toBe("-0.8");
    expect(formatSignedPawnsFromCp(2)).toBe("0.0");
  });

  it("formats signed mate from white POV", () => {
    expect(formatSignedMate(3)).toBe("+M3");
    expect(formatSignedMate(-2)).toBe("−M2");
  });
});

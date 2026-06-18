import { describe, expect, it } from "vitest";
import {
  formatSignedMate,
  formatSignedPawnsFromCp,
  formatWinChanceLoss,
  formatEvalForBoard,
  evalBarSegments,
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

  it("orients eval for the player at the bottom of the board", () => {
    expect(formatEvalForBoard({ cp: 580 }, false)).toEqual({
      text: "+5.8",
      favorable: true,
    });
    expect(formatEvalForBoard({ cp: 580 }, true)).toEqual({
      text: "-5.8",
      favorable: false,
    });
  });

  it("fills eval bar toward the side that is winning", () => {
    const whiteWinning = evalBarSegments(74, false);
    expect(whiteWinning.bottomPct).toBeCloseTo(74);
    expect(whiteWinning.bottomFavorable).toBe(true);

    const whiteWinningFlipped = evalBarSegments(74, true);
    expect(whiteWinningFlipped.bottomPct).toBeCloseTo(26);
    expect(whiteWinningFlipped.topFavorable).toBe(true);
  });
});

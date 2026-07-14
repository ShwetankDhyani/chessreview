import { describe, expect, it } from "vitest";
import {
  formatSignedMate,
  formatSignedPawnsFromCp,
  formatWinChanceLoss,
  formatWinChanceDelta,
  formatEvalForBoard,
  evalBarSegments,
  moverWinChanceDeltaPercent,
  whiteWinPercentFromEval,
  winChanceLossPercent,
} from "./evalDisplay";

describe("evalDisplay", () => {
  it("formats win chance loss from expected points", () => {
    expect(winChanceLossPercent(0.2)).toBe(20);
    expect(formatWinChanceLoss(0.2)).toBe("−20% win chance");
    expect(formatWinChanceLoss(0.005)).toBeNull();
  });

  it("formats signed win-chance fluctuation", () => {
    expect(formatWinChanceDelta(-18.4)).toBe("−18%");
    expect(formatWinChanceDelta(3.2)).toBe("+3%");
    expect(formatWinChanceDelta(0.4)).toBe("0%");
  });

  it("computes mover win-chance delta from stored expected points", () => {
    expect(
      moverWinChanceDeltaPercent({
        color: "w",
        eBefore: 0.72,
        eActual: 0.41,
      })
    ).toBeCloseTo(-31, 5);
  });

  it("computes mover win-chance from CP bar mapping, not sticky WDL", () => {
    const delta = moverWinChanceDeltaPercent({
      color: "w",
      fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      // Flat WDL would claim ~0 change; CP clearly swung.
      eBefore: 0.55,
      eActual: 0.55,
      evalBefore: {
        cp: 400,
        depth: 18,
        source: "local",
        wdl: { w: 550, d: 400, l: 50 },
      },
      evalAfter: {
        cp: 50,
        depth: 18,
        source: "local",
        wdl: { w: 550, d: 400, l: 50 },
      },
    });
    expect(delta).toBeLessThan(-10);
    expect(formatWinChanceDelta(delta)).toMatch(/−/);
  });

  it("flips sign for Black so gain matches their POV", () => {
    const delta = moverWinChanceDeltaPercent({
      color: "b",
      evalBefore: { cp: 200, depth: 18, source: "local" },
      evalAfter: { cp: -200, depth: 18, source: "local" },
    });
    // White win% dropped → Black's win chance rose.
    expect(delta).toBeGreaterThan(10);
  });

  it("drives the eval bar from CP even when WDL is extreme", () => {
    const pct = whiteWinPercentFromEval({
      cp: 80,
      depth: 18,
      source: "local",
      wdl: { w: 980, d: 20, l: 0 },
    });
    // Soft CP (+0.8) must not slam to the 95% clamp just because WDL did.
    expect(pct).toBeLessThan(70);
    expect(pct).toBeGreaterThan(50);
  });

  it("softens distant mates instead of hard-clamping to 95", () => {
    const near = whiteWinPercentFromEval({
      mate: 1,
      depth: 18,
      source: "local",
    });
    const far = whiteWinPercentFromEval({
      mate: 12,
      depth: 18,
      source: "local",
    });
    expect(near).toBeGreaterThan(far);
    expect(far).toBeLessThan(90);
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
    expect(whiteWinning.bottomPlayer).toBe("w");
    expect(whiteWinning.topPlayer).toBe("b");

    const blackWinning = evalBarSegments(20, false);
    expect(blackWinning.bottomPct).toBeCloseTo(20);
    expect(blackWinning.topPct).toBeCloseTo(80);
    expect(blackWinning.bottomPlayer).toBe("w");
    expect(blackWinning.topPlayer).toBe("b");

    const whiteWinningFlipped = evalBarSegments(74, true);
    expect(whiteWinningFlipped.bottomPct).toBeCloseTo(26);
    expect(whiteWinningFlipped.bottomPlayer).toBe("b");
    expect(whiteWinningFlipped.topPlayer).toBe("w");
  });
});

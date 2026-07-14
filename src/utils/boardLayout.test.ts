import { describe, expect, it } from "vitest";
import {
  computeDesktopBoardSize,
  computeMobileBoardSize,
  DESKTOP_LAYOUT,
} from "./boardLayout";

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

describe("computeDesktopBoardSize", () => {
  const shortLaptop = { w: 1440, h: 768 };

  it("reserves room for Save / Reanalyze / Download under the board", () => {
    const withActions = computeDesktopBoardSize(shortLaptop.w, shortLaptop.h, {
      evalGraphOpen: false,
      hasAnalyzedMoves: true,
    });
    const withoutActions = computeDesktopBoardSize(
      shortLaptop.w,
      shortLaptop.h,
      {
        evalGraphOpen: false,
        hasAnalyzedMoves: true,
        reserveBoardActions: false,
      }
    );
    expect(withoutActions - withActions).toBe(DESKTOP_LAYOUT.boardActions);
  });

  it("keeps board + player tags + actions inside short laptop viewports", () => {
    for (const h of [800, 768, 720, 700, 650]) {
      const size = computeDesktopBoardSize(1440, h, {
        evalGraphOpen: false,
        hasAnalyzedMoves: true,
      });
      const column =
        size +
        DESKTOP_LAYOUT.playerRows +
        DESKTOP_LAYOUT.boardActions;
      const available =
        h -
        DESKTOP_LAYOUT.header -
        DESKTOP_LAYOUT.evalGraphBar -
        DESKTOP_LAYOUT.verticalPad;
      expect(column).toBeLessThanOrEqual(available);
      expect(size).toBeGreaterThanOrEqual(240);
    }
  });

  it("shrinks when the eval graph is expanded", () => {
    const closed = computeDesktopBoardSize(1440, 900, {
      evalGraphOpen: false,
      hasAnalyzedMoves: true,
    });
    const open = computeDesktopBoardSize(1440, 900, {
      evalGraphOpen: true,
      hasAnalyzedMoves: true,
    });
    expect(open).toBeLessThan(closed);
  });
});

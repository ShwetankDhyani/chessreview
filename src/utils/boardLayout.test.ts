import { describe, expect, it } from "vitest";
import {
  computeDesktopBoardSize,
  computeMobileBoardSize,
  DESKTOP_LAYOUT,
} from "./boardLayout";

describe("computeMobileBoardSize", () => {
  it("gives a large board on typical phones while leaving coach room", () => {
    const size = computeMobileBoardSize(390, 844, { evalGraphOpen: false });
    expect(size).toBeLessThanOrEqual(390 - 8 - 20);
    expect(size).toBeGreaterThanOrEqual(300);
  });

  it("shrinks further when eval graph is expanded", () => {
    // Short viewport so height (not width) is the binding constraint.
    const closed = computeMobileBoardSize(390, 640, { evalGraphOpen: false });
    const open = computeMobileBoardSize(390, 640, { evalGraphOpen: true });
    expect(open).toBeLessThan(closed);
  });
});

describe("computeDesktopBoardSize", () => {
  it("uses most of a 1080p main column instead of the old 680 cap", () => {
    const size = computeDesktopBoardSize(1920, 1080, {
      evalGraphOpen: false,
      hasAnalyzedMoves: true,
    });
    expect(size).toBeGreaterThan(680);
    expect(size).toBeLessThanOrEqual(DESKTOP_LAYOUT.maxBoard);
    // Height is the binding constraint on 16:9 after chrome reserves.
    expect(size).toBeGreaterThanOrEqual(800);
  });

  it("grows on 1440p but never past the soft ceiling", () => {
    const size = computeDesktopBoardSize(2560, 1440, {
      evalGraphOpen: false,
      hasAnalyzedMoves: true,
    });
    expect(size).toBe(DESKTOP_LAYOUT.maxBoard);
  });

  it("shrinks when the eval graph is open", () => {
    const closed = computeDesktopBoardSize(1680, 1050, {
      evalGraphOpen: false,
      hasAnalyzedMoves: true,
    });
    const open = computeDesktopBoardSize(1680, 1050, {
      evalGraphOpen: true,
      hasAnalyzedMoves: true,
    });
    expect(open).toBeLessThan(closed);
  });

  it("still fits a laptop 1280×800 without clipping chrome", () => {
    const size = computeDesktopBoardSize(1280, 800, {
      evalGraphOpen: false,
      hasAnalyzedMoves: true,
    });
    expect(size).toBeGreaterThanOrEqual(280);
    expect(size).toBeLessThanOrEqual(560);
  });
});

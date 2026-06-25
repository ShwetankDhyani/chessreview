import { describe, expect, it, vi } from "vitest";
import {
  stepBoardOrContinuation,
  type ContinuationNavHandlers,
} from "./continuationNav";

describe("stepBoardOrContinuation", () => {
  const nav: ContinuationNavHandlers = {
    stepForward: vi.fn(),
    stepBack: vi.fn(),
    canStepForward: true,
    canStepBack: true,
  };

  it("steps the engine line forward when available", () => {
    const stepGame = vi.fn();
    stepBoardOrContinuation(1, nav, stepGame);
    expect(nav.stepForward).toHaveBeenCalled();
    expect(stepGame).not.toHaveBeenCalled();
  });

  it("steps the engine line back when available", () => {
    const stepGame = vi.fn();
    stepBoardOrContinuation(-1, nav, stepGame);
    expect(nav.stepBack).toHaveBeenCalled();
    expect(stepGame).not.toHaveBeenCalled();
  });

  it("falls back to game navigation at line start on back", () => {
    const stepGame = vi.fn();
    const atStart: ContinuationNavHandlers = {
      ...nav,
      canStepBack: false,
      stepBack: vi.fn(),
      stepForward: vi.fn(),
    };
    stepBoardOrContinuation(-1, atStart, stepGame);
    expect(atStart.stepBack).not.toHaveBeenCalled();
    expect(stepGame).toHaveBeenCalledWith(-1);
  });

  it("falls back to game navigation at line end on forward", () => {
    const stepGame = vi.fn();
    const atEnd: ContinuationNavHandlers = {
      ...nav,
      canStepForward: false,
      stepBack: vi.fn(),
      stepForward: vi.fn(),
    };
    stepBoardOrContinuation(1, atEnd, stepGame);
    expect(atEnd.stepForward).not.toHaveBeenCalled();
    expect(stepGame).toHaveBeenCalledWith(1);
  });
});

/** Board / keyboard navigation hooks into the interactive engine line. */
export interface ContinuationNavHandlers {
  stepForward: () => void;
  stepBack: () => void;
  canStepForward: boolean;
  canStepBack: boolean;
}

/** Prefer stepping the engine line; fall back to game move navigation. */
export function stepBoardOrContinuation(
  delta: number,
  nav: ContinuationNavHandlers | null,
  stepGame: (delta: number) => void
): void {
  if (delta > 0 && nav?.canStepForward) {
    nav.stepForward();
    return;
  }
  if (delta < 0 && nav?.canStepBack) {
    nav.stepBack();
    return;
  }
  stepGame(delta);
}

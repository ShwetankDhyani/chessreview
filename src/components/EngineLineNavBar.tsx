import type { ContinuationNavHandlers } from "../utils/continuationNav";

interface EngineLineNavBarProps {
  nav: ContinuationNavHandlers;
}

/** Dedicated engine-line controls — separate from board move navigation. */
export function EngineLineNavBar({ nav }: EngineLineNavBarProps) {
  return (
    <div
      className="engine-line-nav flex items-center gap-2 px-3 py-2"
      role="toolbar"
      aria-label="Engine line navigation"
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-chess-accent">
        Engine line
      </span>
      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={nav.stepBack}
          disabled={!nav.canStepBack}
          className="mobile-icon-btn"
          aria-label="Previous engine move"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={nav.stepForward}
          disabled={!nav.canStepForward}
          className="mobile-icon-btn mobile-icon-btn--accent"
          aria-label="Next engine move"
        >
          ›
        </button>
      </div>
    </div>
  );
}

interface GameMoveNavBarProps {
  onPrev: (animate?: boolean) => void;
  onNext: (animate?: boolean) => void;
  canPrev: boolean;
  canNext: boolean;
}

/** Explicit prev/next controls for game moves (not board-edge taps). */
export function GameMoveNavBar({
  onPrev,
  onNext,
  canPrev,
  canNext,
}: GameMoveNavBarProps) {
  return (
    <div
      className="game-move-nav flex items-center justify-center gap-3 px-3 py-2"
      role="toolbar"
      aria-label="Game move navigation"
    >
      <button
        type="button"
        onClick={() => onPrev(true)}
        disabled={!canPrev}
        className="mobile-icon-btn"
        aria-label="Previous move"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={() => onNext(true)}
        disabled={!canNext}
        className="mobile-icon-btn mobile-icon-btn--accent"
        aria-label="Next move"
      >
        ›
      </button>
    </div>
  );
}

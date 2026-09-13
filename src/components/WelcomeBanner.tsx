interface WelcomeBannerProps {
  onDismiss: () => void;
}

/** Compact Games-tab intro — dismissible, minimal chrome. */
export function WelcomeBanner({ onDismiss }: WelcomeBannerProps) {
  return (
    <div className="cr-panel relative px-3 py-2.5 mb-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[14px] font-extrabold tracking-tight text-chess-text">
            Review any game
          </h2>
          <p className="mt-0.5 text-[12px] text-chess-muted leading-snug">
            Paste a Chess.com / Lichess link or PGN for Stockfish analysis.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-chess-muted transition-colors hover:bg-white/5 hover:text-chess-text"
          aria-label="Dismiss welcome message"
        >
          ×
        </button>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="cr-btn-primary mt-2 text-xs px-2.5 py-1"
      >
        Got it
      </button>
    </div>
  );
}

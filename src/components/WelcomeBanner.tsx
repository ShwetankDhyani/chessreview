interface WelcomeBannerProps {
  onDismiss: () => void;
}

export function WelcomeBanner({ onDismiss }: WelcomeBannerProps) {
  return (
    <div className="rounded-xl border border-chess-accent/25 bg-chess-accent/5 p-4 mb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-chess-text">
            Free chess game review — no sign-up
          </h2>
          <p className="text-xs sm:text-sm text-chess-muted mt-1.5 leading-relaxed">
            Paste a Chess.com or Lichess link, or your PGN. ChessReview gives
            clear move ratings, accuracy scores, and Stockfish analysis for club
            and amateur players — free, with nothing to subscribe to.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-chess-muted hover:text-chess-text text-lg leading-none flex-shrink-0 min-w-[2rem] min-h-[2rem]"
          aria-label="Dismiss welcome message"
        >
          ×
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs font-semibold px-3 py-2 rounded-lg bg-chess-accent text-chess-bg hover:opacity-90"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

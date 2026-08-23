interface WelcomeBannerProps {
  onDismiss: () => void;
}

export function WelcomeBanner({ onDismiss }: WelcomeBannerProps) {
  return (
    <div className="rounded-xl border border-chess-accent/20 bg-chess-accent/[0.06] p-4 mb-4 shadow-elev-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold tracking-tight text-chess-text">
            Free chess game review — no sign-up
          </h2>
          <p className="text-xs sm:text-[13px] text-chess-muted mt-1.5 leading-relaxed">
            Paste a Chess.com or Lichess link, or your PGN. ChessReview gives
            clear move ratings, accuracy scores, and Stockfish analysis for club
            and amateur players — free, with nothing to subscribe to.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="flex items-center justify-center rounded-lg text-chess-muted hover:text-chess-text hover:bg-white/5 text-lg leading-none flex-shrink-0 min-w-[2rem] min-h-[2rem] transition-all duration-200 ease-soft active:scale-95"
          aria-label="Dismiss welcome message"
        >
          ×
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs font-semibold tracking-tight px-3 py-2 rounded-lg bg-chess-accent text-chess-bg shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.2)] transition-all duration-200 ease-soft hover:bg-chess-accent-hover active:scale-[0.97]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

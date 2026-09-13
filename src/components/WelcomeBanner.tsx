interface WelcomeBannerProps {
  onDismiss: () => void;
}

/** Compact product intro for the Games tab — one clear promise, then import. */
export function WelcomeBanner({ onDismiss }: WelcomeBannerProps) {
  return (
    <div className="cr-panel relative overflow-hidden px-4 py-3.5 mb-3">
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-chess-accent/10 blur-2xl"
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-chess-accent/90">
            Free · unlimited · private
          </p>
          <h2 className="mt-1 text-[15px] font-extrabold tracking-tight text-chess-text">
            Review any game. Prep the rematch.
          </h2>
          <p className="mt-1.5 text-[12px] sm:text-[13px] text-chess-muted leading-relaxed max-w-md">
            Paste a Chess.com / Lichess link or PGN for Stockfish review — then
            scout form on H2H before you face them again.
          </p>
          <p className="cr-trust-row mt-2.5">
            <span>Stockfish in-browser</span>
            <span className="text-chess-border-strong/70" aria-hidden>
              ·
            </span>
            <span>No account</span>
            <span className="text-chess-border-strong/70" aria-hidden>
              ·
            </span>
            <span>Club-player focus</span>
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
      <div className="relative mt-3">
        <button
          type="button"
          onClick={onDismiss}
          className="cr-btn-primary text-xs px-3 py-1.5"
        >
          Start with a game below
        </button>
      </div>
    </div>
  );
}

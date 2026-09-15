interface WelcomeBannerProps {
  onDismiss: () => void;
}

/** Compact Games-tab intro — dismissible, minimal chrome. */
export function WelcomeBanner({ onDismiss }: WelcomeBannerProps) {
  return (
    <div className="cr-panel relative p-3.5 mb-2 overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="cr-capsule-badge text-[9px] px-2.5 py-0.5 mb-1.5">
            Free • Unlimited • No Ads
          </div>
          <h2 className="text-[15px] font-extrabold tracking-tight text-chess-text">
            Review any game for <span className="cr-text-gradient">free</span>
          </h2>
          <p className="mt-1 text-[11px] text-chess-muted leading-relaxed">
            Paste a Chess.com / Lichess link or PGN for Stockfish analysis and move classifications.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-chess-muted/80 font-medium">
            <span>⚡ Native engine</span>
            <span>🎯 Move grades</span>
            <span>💬 Coach review</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-chess-muted transition-colors hover:bg-white/5 hover:text-chess-text text-sm"
          aria-label="Dismiss welcome message"
        >
          ×
        </button>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="cr-btn-primary mt-3 text-xs px-3 py-1.5 w-full sm:w-auto"
      >
        Got it, let's play →
      </button>
    </div>
  );
}

interface WelcomeBannerProps {
  onDismiss: () => void;
}

export function WelcomeBanner({ onDismiss }: WelcomeBannerProps) {
  return (
    <div className="rounded-xl border border-chess-accent/25 bg-chess-accent/5 p-4 mb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-chess-text">Free chess game review</h2>
          <p className="text-xs text-chess-muted mt-1 leading-relaxed">
            Paste a Lichess or Chess.com link, or your PGN, to see move classifications and accuracy.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-chess-muted hover:text-chess-text text-lg leading-none flex-shrink-0"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-chess-accent text-chess-bg hover:opacity-90"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

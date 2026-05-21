interface AnalyzeNowButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  variant?: "board" | "compact";
  className?: string;
}

/** Lichess-style dark plaque with chess.com accent green CTA. */
export function AnalyzeNowButton({
  onClick,
  disabled,
  variant = "board",
  className = "",
}: AnalyzeNowButtonProps) {
  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || !onClick}
        className={`flex-shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-chess-accent hover:bg-chess-accent-hover disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-colors ${className}`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M8 5v14l11-7z" />
        </svg>
        Analyze
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`pointer-events-auto disabled:opacity-50 group ${className}`}
    >
      <div className="analyze-now-plaque flex flex-col items-stretch gap-3.5 rounded-xl border border-chess-border bg-chess-panel/95 backdrop-blur-sm px-5 py-4 shadow-[0_18px_56px_rgba(0,0,0,0.7)] min-w-[224px]">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-chess-accent/15 border border-chess-accent/30 text-chess-accent"
            aria-hidden
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </span>
          <span className="text-left leading-tight">
            <span className="block text-sm font-bold text-chess-text">
              Game Review
            </span>
            <span className="block text-[11px] font-medium text-chess-muted mt-0.5">
              Engine accuracy & move ratings
            </span>
          </span>
        </div>
        <span className="analyze-now-plaque-btn flex items-center justify-center gap-1.5 rounded-lg bg-chess-accent py-2.5 text-center text-sm font-bold text-white shadow-md transition-all group-hover:bg-chess-accent-hover group-active:scale-[0.98]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
          Analyze now
        </span>
      </div>
    </button>
  );
}

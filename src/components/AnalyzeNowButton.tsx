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
        className={`flex-shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-chess-accent hover:bg-chess-accent-hover disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(0,0,0,0.22),0_4px_12px_-4px_rgba(129,182,76,0.4)] transition-all duration-200 ease-soft active:scale-[0.97] ${className}`}
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
      <div className="analyze-now-plaque flex flex-col items-stretch gap-3.5 rounded-2xl border border-chess-hairline-strong bg-chess-panel/95 backdrop-blur-md px-5 py-4 shadow-elev-4 min-w-[224px]">
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
            <span className="block text-sm font-bold tracking-tight text-chess-text">
              Game Review
            </span>
            <span className="block text-[11px] font-medium leading-snug text-chess-muted mt-0.5">
              Engine accuracy & move ratings
            </span>
          </span>
        </div>
        <span className="analyze-now-plaque-btn flex items-center justify-center gap-1.5 rounded-lg bg-chess-accent py-2.5 text-center text-sm font-bold tracking-tight text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_6px_-1px_rgba(0,0,0,0.25)] transition-all duration-200 ease-soft group-hover:bg-chess-accent-hover group-active:scale-[0.98]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
          Analyze now
        </span>
      </div>
    </button>
  );
}

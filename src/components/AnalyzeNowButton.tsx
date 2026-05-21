interface AnalyzeNowButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  variant?: "board" | "compact";
  className?: string;
}

/** Board: chess.com-style white plaque + green CTA (reads on green squares) */
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
        className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-move-best hover:bg-green-600 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-colors ${className}`}
      >
        <span aria-hidden>♟</span>
        Analyze now
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`pointer-events-auto disabled:opacity-50 ${className}`}
    >
      <div className="analyze-now-plaque flex flex-col items-center gap-3 rounded-xl border border-black/10 bg-white px-6 py-5 shadow-[0_10px_40px_rgba(0,0,0,0.45)] min-w-[210px]">
        <div className="flex items-center gap-2 text-neutral-800">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-move-best"
            aria-hidden
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-left leading-tight">
            <span className="block text-sm font-bold text-neutral-900">
              Game Review
            </span>
            <span className="block text-[10px] font-medium text-neutral-500">
              Engine + move ratings
            </span>
          </span>
        </div>
        <span className="analyze-now-plaque-btn w-full rounded-lg bg-[#5fa032] py-3 text-center text-sm font-bold text-white shadow-md transition-colors hover:bg-[#529628] active:scale-[0.98]">
          Analyze now
        </span>
      </div>
    </button>
  );
}

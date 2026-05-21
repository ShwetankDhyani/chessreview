interface AnalyzeNowButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  variant?: "board" | "compact";
  className?: string;
}

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
        className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-move-best hover:bg-green-600 disabled:opacity-50 text-white text-xs font-bold shadow-md ring-1 ring-[#b8d47a]/50 transition-colors ${className}`}
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
      className={`pointer-events-auto flex flex-col items-center gap-2 disabled:opacity-50 ${className}`}
    >
      <span className="analyze-now-cta flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-move-best text-white text-sm font-bold shadow-lg ring-2 ring-[#b8d47a]/70 ring-offset-2 ring-offset-[#1a1a1a] hover:bg-green-600 active:scale-[0.98] transition-all">
        <span className="text-xl leading-none select-none" aria-hidden>
          ♟
        </span>
        Analyze now
      </span>
      <span className="text-[10px] font-medium text-chess-muted tracking-wide">
        Move ratings · accuracy · coach
      </span>
    </button>
  );
}

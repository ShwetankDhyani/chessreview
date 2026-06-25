interface ReanalyzeButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  spinning?: boolean;
  className?: string;
  compact?: boolean;
}

/** Re-run engine review on the loaded game (refresh icon). */
export function ReanalyzeButton({
  onClick,
  disabled,
  spinning = false,
  className = "",
  compact = false,
}: ReanalyzeButtonProps) {
  const sizeClass = compact ? "h-8 w-8" : "h-9 w-9";
  const iconSize = compact ? 15 : 18;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      aria-label="Re-analyze game"
      title="Re-analyze game with current depth"
      className={`inline-flex items-center justify-center ${sizeClass} flex-shrink-0 rounded-lg border border-chess-border-strong bg-chess-surface text-chess-subtext hover:text-chess-accent hover:border-chess-accent/40 hover:bg-chess-hover transition-colors disabled:opacity-50 disabled:pointer-events-none touch-manipulation ${className}`}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={spinning ? "animate-spin" : undefined}
        aria-hidden
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 3v6h-6" />
      </svg>
    </button>
  );
}

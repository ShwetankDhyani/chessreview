interface BoardAnalysisStripProps {
  progressPercent: number;
  currentPly: number;
  totalPlies: number;
  currentSan?: string;
  stageLabel?: string;
  etaLabel?: string | null;
  className?: string;
}

/**
 * Slim strip shown above the board during analysis: percent + current ply +
 * SAN of the move being scanned, with a thin animated progress bar.
 */
export function BoardAnalysisStrip({
  progressPercent,
  currentPly,
  totalPlies,
  currentSan,
  stageLabel,
  etaLabel,
  className = "",
}: BoardAnalysisStripProps) {
  const pct = Math.min(100, Math.max(0, Math.round(progressPercent)));
  const ply = Math.max(1, Math.min(totalPlies, currentPly));

  return (
    <div
      className={`relative flex-shrink-0 overflow-hidden rounded-lg border border-chess-border bg-chess-panel shadow-sm ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`Analyzing, ${pct} percent`}
    >
      <div className="flex items-center gap-3 px-3 py-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-chess-accent flex-shrink-0 min-w-0">
          <span className="h-1.5 w-1.5 rounded-full bg-chess-accent animate-pulse flex-shrink-0" />
          <span className="truncate">{stageLabel ?? "Analyzing"}</span>
        </span>
        <span className="text-[11px] text-chess-subtext tabular-nums flex-shrink-0">
          Ply <span className="font-semibold text-chess-text">{ply}</span>
          <span className="text-chess-muted"> / {totalPlies}</span>
        </span>
        {currentSan && (
          <span className="text-[11px] font-mono text-chess-text truncate flex-1">
            {currentSan}
          </span>
        )}
        <span className="ml-auto text-xs font-bold text-chess-accent tabular-nums flex-shrink-0">
          {pct}%
        </span>
        {etaLabel ? (
          <span className="text-[10px] text-chess-muted tabular-nums flex-shrink-0 hidden sm:inline">
            {etaLabel}
          </span>
        ) : null}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-chess-border/60 overflow-hidden">
        <div
          className="h-full bg-chess-accent transition-all duration-300"
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

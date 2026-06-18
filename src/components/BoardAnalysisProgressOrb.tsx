interface BoardAnalysisProgressOrbProps {
  percent: number;
  stageLabel: string;
  currentSan?: string;
  etaLabel?: string | null;
  compact?: boolean;
}

/** Animated engine orb with circular progress — uses board-engine-orb CSS. */
export function BoardAnalysisProgressOrb({
  percent,
  stageLabel,
  currentSan,
  etaLabel,
  compact = false,
}: BoardAnalysisProgressOrbProps) {
  const pct = Math.min(100, Math.max(0, Math.round(percent)));
  const r = 46;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;

  return (
    <div
      className={`board-overlay-stage flex flex-col items-center gap-3 pointer-events-none ${
        compact ? "scale-90" : ""
      }`}
    >
      <div className="board-engine-orb board-engine-orb--active board-overlay-float">
        <div className="board-engine-orb-ring board-engine-orb-ring--back" aria-hidden />
        <div className="board-engine-orb-ring board-engine-orb-ring--front" aria-hidden />
        <div className="board-engine-orb-core">
          <svg
            className="board-engine-orb-progress -rotate-90"
            viewBox="0 0 100 100"
            aria-hidden
          >
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="5"
            />
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="rgba(150, 188, 75, 0.85)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
              style={{ transition: "stroke-dasharray 0.35s ease" }}
            />
          </svg>
          <div className="board-engine-orb-pct">
            <span className="text-lg font-bold text-white tabular-nums drop-shadow-md">
              {pct}%
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-[min(280px,88vw)] text-center board-overlay-float">
        <p className="text-sm font-semibold text-chess-text">{stageLabel}</p>
        {currentSan && (
          <p className="mt-1 text-xs font-mono text-chess-subtext truncate">
            Move <span className="text-chess-accent">{currentSan}</span>
          </p>
        )}
        {etaLabel && (
          <p className="mt-1 text-[11px] text-chess-muted tabular-nums">{etaLabel}</p>
        )}
      </div>
    </div>
  );
}

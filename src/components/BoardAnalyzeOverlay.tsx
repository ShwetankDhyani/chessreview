import type { AnalysisState } from "../types";
import { EngineCrunchVisual } from "./EngineCrunchVisual";

interface BoardAnalyzeOverlayProps {
  state: AnalysisState;
  progressPercent: number;
  playerLabel?: string;
  onAnalyze?: () => void;
  disabled?: boolean;
}

export function BoardAnalyzeOverlay({
  state,
  progressPercent,
  playerLabel,
  onAnalyze,
  disabled,
}: BoardAnalyzeOverlayProps) {
  const show =
    state === "loading" || state === "analyzing" || state === "error";
  if (!show) return null;

  const analyzing = state === "analyzing";
  const pct = Math.round(Math.min(100, Math.max(0, progressPercent)));
  const ringRadius = 44;
  const circumference = 2 * Math.PI * ringRadius;
  const dash = (pct / 100) * circumference;

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none board-overlay-stage"
      aria-live="polite"
    >
      <div className="absolute inset-0 board-overlay-vignette" aria-hidden />

      <div className="relative pointer-events-auto flex flex-col items-center gap-4 board-overlay-float">
        {analyzing ? (
          <>
            <div className="board-engine-orb board-engine-orb--active">
              <div className="board-engine-orb-ring board-engine-orb-ring--back" />
              <svg
                className="board-engine-orb-progress -rotate-90"
                viewBox="0 0 100 100"
                aria-hidden
              >
                <circle
                  cx="50"
                  cy="50"
                  r={ringRadius}
                  fill="none"
                  stroke="rgba(150,188,75,0.15)"
                  strokeWidth="5"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={ringRadius}
                  fill="none"
                  stroke="#96bc4b"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circumference}`}
                  className="transition-[stroke-dasharray] duration-300 ease-out"
                />
              </svg>
              <div className="board-engine-orb-core">
                <EngineCrunchVisual size="sm" active />
              </div>
              <div className="board-engine-orb-pct">
                <span className="text-xl font-bold tabular-nums text-white drop-shadow-lg">
                  {pct}%
                </span>
              </div>
            </div>
            <p className="text-center text-[11px] text-white/80 font-medium tracking-wide drop-shadow-md max-w-[220px]">
              Stockfish crunching positions
            </p>
          </>
        ) : state === "error" ? (
          <div className="board-engine-orb board-engine-orb--error">
            <span className="text-2xl">⚠</span>
            <p className="text-sm text-red-200 mt-2">Analysis failed</p>
            {onAnalyze ? (
              <button
                type="button"
                onClick={onAnalyze}
                className="mt-2 text-xs font-semibold text-move-best hover:text-green-300"
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={onAnalyze}
            disabled={disabled || !onAnalyze}
            className="group flex flex-col items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="board-engine-orb board-engine-orb--idle group-hover:board-engine-orb--hover">
              <div className="board-engine-orb-ring board-engine-orb-ring--front" />
              <div className="board-engine-orb-core board-engine-orb-core--idle">
                <EngineCrunchVisual size="md" active />
              </div>
            </div>
            <div className="text-center drop-shadow-lg">
              <span className="block text-sm font-bold text-white tracking-tight">
                Analyze Game
              </span>
              <span className="block text-[10px] text-white/65 mt-0.5">
                Engine review · move ratings
              </span>
            </div>
          </button>
        )}

        {playerLabel && !analyzing ? (
          <p className="text-[10px] text-white/50 truncate max-w-[200px] drop-shadow">
            {playerLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}

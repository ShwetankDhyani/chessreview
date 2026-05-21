import type { AnalysisState } from "../types";
import { EngineCrunchVisual } from "./EngineCrunchVisual";

interface BoardAnalyzeOverlayProps {
  state: AnalysisState;
  progressPercent: number;
  onAnalyze?: () => void;
  disabled?: boolean;
}

export function BoardAnalyzeOverlay({
  state,
  progressPercent,
  onAnalyze,
  disabled,
}: BoardAnalyzeOverlayProps) {
  const show =
    state === "loading" || state === "analyzing" || state === "error";
  if (!show) return null;

  const analyzing = state === "analyzing";
  const pct = Math.min(100, Math.max(0, Math.round(progressPercent)));

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
      aria-live="polite"
    >
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-[1px]"
        aria-hidden
      />

      {analyzing ? (
        <div className="pointer-events-none flex flex-col items-center gap-3">
          <div className="relative w-20 h-20 rounded-full border border-white/15 bg-chess-panel/85 shadow-xl flex items-center justify-center overflow-hidden">
            <div className="absolute inset-2 opacity-80">
              <EngineCrunchVisual size="sm" active />
            </div>
            <svg
              className="absolute inset-0 w-full h-full -rotate-90"
              viewBox="0 0 80 80"
              aria-hidden
            >
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="4"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="#96bc4b"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * 213.6} 213.6`}
                className="transition-[stroke-dasharray] duration-500 ease-out"
              />
            </svg>
            <span className="relative z-10 text-sm font-bold tabular-nums text-chess-text">
              {pct}%
            </span>
          </div>
          <p className="text-[10px] text-white/75 font-medium tracking-wide">
            Analyzing game…
          </p>
        </div>
      ) : state === "error" ? (
        <div className="pointer-events-auto text-center px-4 py-3 rounded-lg bg-chess-panel/95 border border-red-500/30">
          <p className="text-sm text-red-300">Analysis failed</p>
          {onAnalyze ? (
            <button
              type="button"
              onClick={onAnalyze}
              className="mt-2 text-xs font-semibold text-move-best hover:text-green-400"
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={onAnalyze}
          disabled={disabled || !onAnalyze}
          className="pointer-events-auto group flex flex-col items-center gap-2.5 disabled:opacity-50"
        >
          <span className="flex items-center justify-center w-14 h-14 rounded-full bg-move-best/90 text-white shadow-lg shadow-black/40 ring-2 ring-white/20 group-hover:bg-green-600 group-hover:scale-[1.03] transition-all duration-200">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className="px-4 py-2 rounded-lg bg-chess-panel/92 border border-chess-border/80 shadow-xl backdrop-blur-sm">
            <span className="block text-sm font-semibold text-chess-text">
              Analyze now
            </span>
            <span className="block text-[10px] text-chess-muted mt-0.5">
              Move ratings & accuracy
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

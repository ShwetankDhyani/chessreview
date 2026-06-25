import type { AnalysisState } from "../types";
import { AnalyzeNowButton } from "./AnalyzeNowButton";

interface BoardAnalyzeOverlayProps {
  state: AnalysisState;
  onAnalyze?: () => void;
  progressPercent?: number;
  stageLabel?: string;
  currentSan?: string;
  etaLabel?: string | null;
  showProgressOrb?: boolean;
}

/** Minimal on-board status while analyzing — no heavy animation. */
export function BoardAnalyzeOverlay({
  state,
  onAnalyze,
  progressPercent = 0,
  stageLabel = "Reviewing game…",
  currentSan,
}: BoardAnalyzeOverlayProps) {
  if (state === "analyzing") {
    const pct = Math.min(100, Math.max(0, Math.round(progressPercent)));
    return (
      <div
        className="absolute inset-x-2 top-2 z-20 pointer-events-none"
        aria-live="polite"
        aria-busy="true"
        aria-label={`Analyzing, ${pct} percent`}
      >
        <div className="rounded-md border border-chess-border/80 bg-chess-panel/92 px-2.5 py-1.5 shadow-sm flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-bold text-chess-accent tabular-nums flex-shrink-0">
            {pct}%
          </span>
          <span className="text-[10px] text-chess-muted truncate">{stageLabel}</span>
          {currentSan ? (
            <span className="text-[10px] font-mono text-chess-text truncate ml-auto">
              {currentSan}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div
        className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
        aria-live="polite"
      >
        <AnalyzeNowButton onClick={onAnalyze} variant="board" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div
        className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
        aria-live="polite"
      >
        <div className="pointer-events-auto flex flex-col items-center gap-2 px-4 py-3 rounded-lg bg-chess-panel border border-chess-border shadow-md">
          <p className="text-sm text-red-300">Analysis failed</p>
          <AnalyzeNowButton onClick={onAnalyze} variant="compact" />
        </div>
      </div>
    );
  }

  return null;
}

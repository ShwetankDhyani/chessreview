import type { AnalysisState } from "../types";
import { AnalyzeNowButton } from "./AnalyzeNowButton";
import { BoardAnalysisProgressOrb } from "./BoardAnalysisProgressOrb";

interface BoardAnalyzeOverlayProps {
  state: AnalysisState;
  onAnalyze?: () => void;
  progressPercent?: number;
  stageLabel?: string;
  currentSan?: string;
  etaLabel?: string | null;
  showProgressOrb?: boolean;
}

export function BoardAnalyzeOverlay({
  state,
  onAnalyze,
  progressPercent = 0,
  stageLabel = "Reviewing game…",
  currentSan,
  etaLabel,
  showProgressOrb = false,
}: BoardAnalyzeOverlayProps) {
  if (state === "analyzing") {
    if (showProgressOrb) {
      return (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-black/35 backdrop-blur-[1px]"
          aria-live="polite"
          aria-busy="true"
          aria-label={`Analyzing, ${Math.round(progressPercent)} percent`}
        >
          <BoardAnalysisProgressOrb
            percent={progressPercent}
            stageLabel={stageLabel}
            currentSan={currentSan}
            etaLabel={etaLabel}
          />
        </div>
      );
    }

    return (
      <div
        className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="px-4 py-2.5 rounded-lg bg-chess-panel/95 border border-chess-border shadow-md flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-chess-accent animate-pulse" />
          <span className="text-sm text-chess-text font-medium">Reviewing game…</span>
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

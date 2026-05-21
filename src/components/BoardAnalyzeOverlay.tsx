import type { AnalysisState } from "../types";
import { AnalyzeNowButton } from "./AnalyzeNowButton";

interface BoardAnalyzeOverlayProps {
  state: AnalysisState;
  onAnalyze?: () => void;
}

export function BoardAnalyzeOverlay({
  state,
  onAnalyze,
}: BoardAnalyzeOverlayProps) {
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

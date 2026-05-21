import type { AnalysisState } from "../types";

interface BoardAnalyzeOverlayProps {
  state: AnalysisState;
  onAnalyze?: () => void;
}

/** Centered Analyze now / retry — no scrim, animations, or progress orb */
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
        <button
          type="button"
          onClick={onAnalyze}
          disabled={!onAnalyze}
          className="pointer-events-auto px-6 py-3 bg-move-best hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-md transition-colors"
        >
          Analyze now
        </button>
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
          {onAnalyze ? (
            <button
              type="button"
              onClick={onAnalyze}
              className="px-4 py-2 bg-move-best hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Try again
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return null;
}

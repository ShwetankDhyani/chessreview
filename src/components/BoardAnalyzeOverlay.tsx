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
  currentPly?: number;
  totalPlies?: number;
}

const RING_R = 34;
const RING_C = 2 * Math.PI * RING_R;

/** On-board analysis status — centered veil during review, CTA when idle. */
export function BoardAnalyzeOverlay({
  state,
  onAnalyze,
  progressPercent = 0,
  stageLabel = "Reviewing game…",
  currentSan,
  currentPly,
  totalPlies,
}: BoardAnalyzeOverlayProps) {
  if (state === "analyzing") {
    const pct = Math.min(100, Math.max(0, progressPercent));
    const pctLabel = Math.round(pct);
    const dashOffset = RING_C * (1 - pct / 100);
    const plyNote =
      totalPlies !== undefined && totalPlies > 0 && currentPly !== undefined
        ? `${Math.min(totalPlies, currentPly + 1)} / ${totalPlies}`
        : null;

    return (
      <div
        className="board-analysis-veil"
        aria-live="polite"
        aria-busy="true"
        aria-label={`Analyzing, ${pctLabel} percent`}
      >
        <div className="board-analysis-glow" aria-hidden />
        <div className="board-analysis-center">
          <div className="board-analysis-ring-wrap">
            <svg
              className="board-analysis-ring"
              viewBox="0 0 80 80"
              aria-hidden
            >
              <circle
                className="board-analysis-ring-track"
                cx="40"
                cy="40"
                r={RING_R}
                fill="none"
                strokeWidth="3"
              />
              <circle
                className="board-analysis-ring-progress"
                cx="40"
                cy="40"
                r={RING_R}
                fill="none"
                strokeWidth="3"
                strokeDasharray={RING_C}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform="rotate(-90 40 40)"
              />
            </svg>
            <span className="board-analysis-pct">{pctLabel}%</span>
          </div>
          <p className="board-analysis-stage">{stageLabel}</p>
          {currentSan ? (
            <p className="board-analysis-move">{currentSan}</p>
          ) : null}
          {plyNote ? (
            <p className="board-analysis-plies">{plyNote}</p>
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

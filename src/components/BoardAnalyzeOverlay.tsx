import type { AnalysisState } from "../types";
import { AnalyzeNowButton } from "./AnalyzeNowButton";

export interface BoardReviewConflict {
  /** Label for the game currently analyzing / pinned, e.g. "Alice vs Bob". */
  runningLabel: string;
  progressPercent: number;
  onWait: () => void;
  onCancelAndAnalyze: () => void;
  /** Finished review parked while browsing another board. */
  done?: boolean;
}

interface BoardAnalyzeOverlayProps {
  state: AnalysisState;
  onAnalyze?: () => void;
  onCancel?: () => void;
  progressPercent?: number;
  stageLabel?: string;
  currentSan?: string;
  etaLabel?: string | null;
  showProgressOrb?: boolean;
  currentPly?: number;
  totalPlies?: number;
  /** Shown when this board is open while another game is still analyzing. */
  conflict?: BoardReviewConflict | null;
}

const RING_R = 34;
const RING_C = 2 * Math.PI * RING_R;

/** On-board analysis status — centered veil during review, CTA when idle. */
export function BoardAnalyzeOverlay({
  state,
  onAnalyze,
  onCancel,
  progressPercent = 0,
  stageLabel = "Reviewing game…",
  currentSan,
  currentPly,
  totalPlies,
  conflict = null,
}: BoardAnalyzeOverlayProps) {
  if (conflict) {
    const pct = Math.min(100, Math.max(0, Math.round(conflict.progressPercent)));
    const done = conflict.done === true;
    return (
      <div
        className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
        aria-live="polite"
        role="dialog"
        aria-label={
          done
            ? "A finished review is still open"
            : "Another review is already underway"
        }
      >
        <div className="analyze-now-plaque pointer-events-auto flex flex-col items-stretch gap-3.5 rounded-xl border border-chess-border bg-chess-panel/95 backdrop-blur-sm px-5 py-4 shadow-[0_18px_56px_rgba(0,0,0,0.7)] min-w-[240px] max-w-[280px]">
          <div className="flex items-start gap-2.5">
            <span
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-chess-accent/15 border border-chess-accent/30 text-chess-accent"
              aria-hidden
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </span>
            <span className="text-left leading-tight min-w-0">
              <span className="block text-sm font-bold text-chess-text">
                {done ? "Review ready" : "Review already running"}
              </span>
              <span className="mt-0.5 block text-[11px] font-medium text-chess-muted">
                {done ? (
                  <span className="text-chess-subtext">{conflict.runningLabel}</span>
                ) : (
                  <>
                    <span className="text-chess-accent font-semibold tabular-nums">
                      {pct}%
                    </span>
                    {" · "}
                    <span className="text-chess-subtext">{conflict.runningLabel}</span>
                  </>
                )}
              </span>
            </span>
          </div>
          {done ? (
            <>
              <button
                type="button"
                onClick={conflict.onWait}
                className="analyze-now-plaque-btn flex items-center justify-center gap-1.5 rounded-lg bg-chess-accent py-2.5 text-center text-sm font-bold text-white shadow-md transition-colors hover:bg-chess-accent-hover active:scale-[0.98]"
              >
                Open review
              </button>
              <button
                type="button"
                onClick={conflict.onCancelAndAnalyze}
                className="flex items-center justify-center rounded-lg border border-chess-border-strong bg-chess-surface py-2 text-center text-[12px] font-semibold text-chess-subtext transition-colors hover:border-chess-accent/40 hover:text-chess-text"
              >
                Analyze this instead
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={conflict.onCancelAndAnalyze}
                className="analyze-now-plaque-btn flex items-center justify-center gap-1.5 rounded-lg bg-chess-accent py-2.5 text-center text-sm font-bold text-white shadow-md transition-colors hover:bg-chess-accent-hover active:scale-[0.98]"
              >
                Cancel &amp; analyze this
              </button>
              <button
                type="button"
                onClick={conflict.onWait}
                className="flex items-center justify-center rounded-lg border border-chess-border-strong bg-chess-surface py-2 text-center text-[12px] font-semibold text-chess-subtext transition-colors hover:border-chess-accent/40 hover:text-chess-text"
              >
                Wait for the other review
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

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
        <div className="board-analysis-center pointer-events-auto">
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
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="mt-2 px-2.5 py-1 rounded border border-white/15 text-[11px] font-semibold text-white/85 hover:text-white hover:border-white/35 transition-colors"
            >
              Cancel
            </button>
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

  return null;
}

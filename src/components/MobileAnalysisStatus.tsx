import React from "react";
import type { AnalysisState } from "../types";

interface MobileAnalysisStatusProps {
  state: AnalysisState;
  progress: { done: number; total: number };
  whiteName: string;
  blackName: string;
}

export const MobileAnalysisStatus: React.FC<MobileAnalysisStatusProps> = ({
  state,
  progress,
  whiteName,
  blackName,
}) => {
  if (state !== "analyzing") return null;

  const percent =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const indeterminate = progress.total === 0;
  const ringRadius = 18;
  const ringCirc = 2 * Math.PI * ringRadius;
  const ringOffset = indeterminate
    ? ringCirc * 0.25
    : ringCirc - (percent / 100) * ringCirc;

  return (
    <>
      {/* Thin progress rail under the header */}
      <div
        className="lg:hidden fixed top-[44px] left-0 right-0 z-50 h-[3px] bg-chess-border/80 pointer-events-none"
        aria-hidden
      >
        <div
          className={`h-full bg-gradient-to-r from-move-best via-green-400 to-move-best ${
            indeterminate ? "analysis-rail-indeterminate w-1/3" : "transition-all duration-300 ease-out"
          }`}
          style={indeterminate ? undefined : { width: `${Math.max(percent, 4)}%` }}
        />
      </div>

      {/* Floating status card above bottom tab bar */}
      <div
        className="lg:hidden fixed left-3 right-3 z-50 pointer-events-none"
        style={{ bottom: "calc(52px + env(safe-area-inset-bottom, 0px))" }}
        role="status"
        aria-live="polite"
        aria-label={
          indeterminate
            ? "Analyzing game"
            : `Analyzing position ${progress.done} of ${progress.total}, ${percent} percent complete`
        }
      >
        <div className="analysis-status-card rounded-2xl border border-move-best/25 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 analysis-status-shimmer pointer-events-none" aria-hidden />

          <div className="relative flex items-center gap-3 px-3.5 py-3">
            <div className="relative flex-shrink-0 w-11 h-11">
              <svg
                className={`w-11 h-11 -rotate-90 ${indeterminate ? "animate-spin" : ""}`}
                viewBox="0 0 44 44"
                aria-hidden
              >
                <circle
                  cx="22"
                  cy="22"
                  r={ringRadius}
                  fill="none"
                  stroke="#3a3a3a"
                  strokeWidth="3"
                />
                <circle
                  cx="22"
                  cy="22"
                  r={ringRadius}
                  fill="none"
                  stroke="#6daa6d"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={ringCirc}
                  strokeDashoffset={ringOffset}
                  className={indeterminate ? undefined : "transition-all duration-300"}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-base select-none">
                ♟
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-move-best">
                Engine review
              </p>
              <p className="text-sm font-medium text-chess-text truncate">
                {whiteName} vs {blackName}
              </p>
              <p className="text-xs text-chess-muted mt-0.5">
                {indeterminate
                  ? "Preparing positions…"
                  : `Position ${progress.done} of ${progress.total}`}
              </p>
            </div>

            <div className="flex-shrink-0 text-right">
              <span className="text-lg font-mono font-bold text-move-best tabular-nums">
                {indeterminate ? "…" : `${percent}%`}
              </span>
            </div>
          </div>

          <div className="relative h-1 bg-chess-border/60">
            <div
              className={`h-full bg-gradient-to-r from-move-best to-green-400 ${
                indeterminate ? "analysis-bar-indeterminate" : "transition-all duration-300 ease-out"
              }`}
              style={indeterminate ? undefined : { width: `${Math.max(percent, 2)}%` }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

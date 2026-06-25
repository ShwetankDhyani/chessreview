import React from "react";
import type { AnalysisState } from "../types";

interface MobileAnalysisStatusProps {
  state: AnalysisState;
  progressPercent: number;
  stageLabel: string;
  currentSan?: string;
  currentPly?: number;
  totalPlies?: number;
}

/** Single slim bar above the tab bar — no duplicate board overlay. */
export const MobileAnalysisStatus: React.FC<MobileAnalysisStatusProps> = ({
  state,
  progressPercent,
  stageLabel,
  currentSan,
  currentPly,
  totalPlies,
}) => {
  if (state !== "analyzing") return null;

  const pct = Math.min(100, Math.max(0, progressPercent));
  const pctLabel = Math.min(100, Math.max(0, Math.round(progressPercent)));
  const plyNote =
    currentPly !== undefined && totalPlies !== undefined && totalPlies > 0
      ? `${Math.min(totalPlies, currentPly + 1)}/${totalPlies}`
      : null;

  return (
    <div
      className="lg:hidden fixed left-0 right-0 z-30 pointer-events-none"
      style={{ bottom: "var(--mobile-tab-bar)" }}
      role="status"
      aria-live="polite"
      aria-label={`Analyzing, ${pctLabel} percent`}
    >
      <div className="mx-3 rounded-lg border border-chess-border/80 bg-chess-panel/95 px-3 py-2 shadow-md">
        <div className="flex items-center gap-2 min-w-0 text-[11px]">
          <span className="font-bold text-chess-accent tabular-nums flex-shrink-0">
            {pctLabel}%
          </span>
          <span className="text-chess-muted truncate flex-shrink-0">{stageLabel}</span>
          {currentSan ? (
            <span className="font-mono text-chess-text truncate">{currentSan}</span>
          ) : null}
          {plyNote ? (
            <span className="text-chess-muted tabular-nums ml-auto flex-shrink-0">
              {plyNote}
            </span>
          ) : null}
        </div>
        <div className="mt-1.5 h-0.5 rounded-full bg-chess-border/60 overflow-hidden">
          <div
            className="h-full bg-chess-accent transition-all duration-300"
            style={{ width: `${Math.max(pct, 2)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

import React from "react";
import type { AnalysisState } from "../types";

interface MobileAnalysisStatusProps {
  state: AnalysisState;
  progressPercent: number;
  whiteName: string;
  blackName: string;
}

export const MobileAnalysisStatus: React.FC<MobileAnalysisStatusProps> = ({
  state,
  progressPercent,
  whiteName,
  blackName,
}) => {
  if (state !== "analyzing") return null;

  const pct = Math.min(100, Math.max(0, Math.round(progressPercent)));

  return (
    <div
      className="lg:hidden fixed left-0 right-0 z-30 pointer-events-none"
      style={{ bottom: "calc(52px + env(safe-area-inset-bottom, 0px))" }}
      role="status"
      aria-live="polite"
      aria-label={`Analyzing game, ${pct} percent`}
    >
      <div className="mx-3 rounded-lg border border-chess-border bg-chess-panel shadow-md px-3 py-2.5">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-chess-text">Analyzing…</p>
            <p className="text-[10px] text-chess-muted truncate">
              {whiteName} vs {blackName}
            </p>
          </div>
          <span className="text-sm font-bold text-move-best tabular-nums flex-shrink-0">
            {pct}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-chess-border overflow-hidden">
          <div
            className="h-full bg-move-best"
            style={{ width: `${Math.max(pct, 2)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

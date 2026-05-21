import { useState } from "react";
import type { AnalyzedMove } from "../types";
import { EvalChart } from "./EvalChart";

interface EvalChartPanelProps {
  moves: AnalyzedMove[];
  currentMoveIndex: number;
  onMoveSelect: (index: number) => void;
  className?: string;
}

/** Collapsible eval graph — collapsed by default so the board keeps space */
export function EvalChartPanel({
  moves,
  currentMoveIndex,
  onMoveSelect,
  className = "",
}: EvalChartPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`flex-shrink-0 border-t border-chess-border bg-chess-panel ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-chess-hover/50 transition-colors"
        aria-expanded={open}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-chess-muted">
          Eval graph
        </span>
        <span className="text-[10px] text-chess-muted tabular-nums">
          {open ? "Hide ▾" : "Show ▸"}
        </span>
      </button>
      <div
        className={`overflow-hidden transition-[height] duration-300 ease-out ${
          open ? "h-28" : "h-0"
        }`}
      >
        <EvalChart
          moves={moves}
          currentMoveIndex={currentMoveIndex}
          onMoveSelect={onMoveSelect}
        />
      </div>
    </div>
  );
}

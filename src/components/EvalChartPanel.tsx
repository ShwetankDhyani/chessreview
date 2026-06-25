import { useState } from "react";
import type { AnalyzedMove } from "../types";
import { EvalChart } from "./EvalChart";

interface EvalChartPanelProps {
  moves: AnalyzedMove[];
  currentMoveIndex: number;
  onMoveSelect: (index: number) => void;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Docked below board on mobile — fixed toggle row, chart expands in place */
  docked?: boolean;
  /** No header label — flows as part of the review stack */
  integrated?: boolean;
}

/** Collapsible eval graph — docked mode keeps a fixed slot below the board */
export function EvalChartPanel({
  moves,
  currentMoveIndex,
  onMoveSelect,
  className = "",
  open: openProp,
  onOpenChange,
  docked = false,
  integrated = false,
}: EvalChartPanelProps) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp ?? openInternal;
  const toggle = () => {
    const next = !open;
    if (openProp === undefined) setOpenInternal(next);
    onOpenChange?.(next);
  };

  if (docked || integrated) {
    return (
      <div
        className={`flex-shrink-0 border-t border-chess-border/50 bg-chess-panel/90 ${className}`}
      >
        <button
          type="button"
          onClick={toggle}
          className="w-full flex items-center justify-between gap-2 px-3 h-9 text-left hover:bg-chess-hover/40 transition-colors"
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
          className="overflow-hidden transition-[height] duration-200 ease-out"
          style={{ height: open ? "4.5rem" : "0px" }}
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

  return (
    <div
      className={`flex-shrink-0 mt-1.5 border-t border-chess-border bg-chess-panel ${className}`}
    >
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-chess-hover/50 transition-colors"
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
        className={`overflow-hidden transition-[height] duration-200 ease-out ${
          open ? "h-14" : "h-0"
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

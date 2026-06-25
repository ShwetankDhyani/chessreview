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
  /** No header label — flows as part of the review stack */
  integrated?: boolean;
}

/** Collapsible eval graph — integrated mode is label-free with a subtle expand control */
export function EvalChartPanel({
  moves,
  currentMoveIndex,
  onMoveSelect,
  className = "",
  open: openProp,
  onOpenChange,
  integrated = false,
}: EvalChartPanelProps) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp ?? openInternal;
  const toggle = () => {
    const next = !open;
    if (openProp === undefined) setOpenInternal(next);
    onOpenChange?.(next);
  };

  if (integrated) {
    return (
      <div className={`relative flex-shrink-0 ${className}`}>
        <button
          type="button"
          onClick={toggle}
          className="absolute right-2 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-chess-bg/70 text-chess-muted hover:text-chess-text hover:bg-chess-hover/80 transition-colors"
          aria-expanded={open}
          aria-label={open ? "Collapse eval chart" : "Expand eval chart"}
        >
          <span className="text-[9px] leading-none" aria-hidden>
            {open ? "▾" : "▴"}
          </span>
        </button>
        <div
          className={`overflow-hidden transition-[height] duration-300 ease-out ${
            open ? "h-[4.5rem]" : "h-9"
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

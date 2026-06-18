import React from "react";
import { normalizeEval } from "../engine/evaluationService";
import type { EvalResult } from "../types";
import { formatEvalForBoard } from "../utils/evalDisplay";

interface EvalBadgeProps {
  evalResult: EvalResult | null;
  compact?: boolean;
  /** Whose perspective to show — defaults to white. Pass mover color for coach. */
  perspective?: "w" | "b";
  boardFlipped?: boolean;
}

/** Compact eval readout (coach panel). Uses board orientation or explicit perspective. */
export const EvalBadge: React.FC<EvalBadgeProps> = ({
  evalResult,
  compact = false,
  perspective,
  boardFlipped = false,
}) => {
  const fromBottom = perspective ?? (boardFlipped ? "b" : "w");
  const oriented =
    evalResult == null
      ? { text: "—", favorable: true }
      : formatEvalForBoard(
          evalResult,
          fromBottom === "b"
        );

  const label = oriented.text;
  const color = oriented.favorable ? "#6daa6d" : "#ca3c3c";

  let barPct = 50;
  if (evalResult?.mate !== undefined) {
    const m = fromBottom === "b" ? -evalResult.mate : evalResult.mate;
    barPct = m > 0 ? 88 : 12;
  } else if (evalResult) {
    const cp =
      fromBottom === "b" ? -(evalResult.cp ?? 0) : (evalResult.cp ?? 0);
    const norm = normalizeEval(cp);
    barPct = Math.min(92, Math.max(8, 50 + norm / 2));
  }

  if (compact) {
    return (
      <span
        className="font-mono text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded"
        style={{ color, background: `${color}18` }}
        title={
          fromBottom === "b"
            ? "Your eval (Black at bottom)"
            : "Your eval (White at bottom)"
        }
      >
        {label}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-12 h-1.5 rounded-full bg-chess-border overflow-hidden flex-shrink-0">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${barPct}%`, backgroundColor: color }}
        />
      </div>
      <span
        className="font-mono text-xs font-semibold tabular-nums"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
};

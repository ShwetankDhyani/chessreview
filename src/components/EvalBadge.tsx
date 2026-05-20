import React from "react";
import { normalizeEval } from "../engine/evaluationService";
import type { EvalResult } from "../types";

export function formatEvalShort(evalResult: EvalResult | null): string {
  if (!evalResult) return "—";
  if (evalResult.mate !== undefined) {
    const m = evalResult.mate;
    return m > 0 ? `M${m}` : `M${Math.abs(m)}`;
  }
  const cp = evalResult.cp ?? 0;
  const pawns = (cp / 100).toFixed(1);
  return cp > 0 ? `+${pawns}` : pawns;
}

export function evalAccentColor(evalResult: EvalResult | null): string {
  if (!evalResult) return "#888";
  if (evalResult.mate !== undefined) {
    return evalResult.mate > 0 ? "#6daa6d" : "#ca3c3c";
  }
  const cp = evalResult.cp ?? 0;
  if (cp > 150) return "#6daa6d";
  if (cp < -150) return "#ca3c3c";
  return "#b0b0b0";
}

interface EvalBadgeProps {
  evalResult: EvalResult | null;
  compact?: boolean;
}

/** Compact eval readout for the coach panel (replaces repeating analysis chrome) */
export const EvalBadge: React.FC<EvalBadgeProps> = ({
  evalResult,
  compact = false,
}) => {
  const label = formatEvalShort(evalResult);
  const color = evalAccentColor(evalResult);

  let barPct = 50;
  if (evalResult?.mate !== undefined) {
    barPct = evalResult.mate > 0 ? 88 : 12;
  } else if (evalResult) {
    const norm = normalizeEval(evalResult.cp ?? 0);
    barPct = Math.min(92, Math.max(8, 50 + norm / 2));
  }

  if (compact) {
    return (
      <span
        className="font-mono text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded"
        style={{ color, background: `${color}18` }}
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

import React from "react";
import { normalizeEval } from "../engine/evaluationService";
import type { EvalResult } from "../types";
import {
  evalBarSegments,
  formatEvalForBoard,
} from "../utils/evalDisplay";

interface EvalBarProps {
  evalResult: EvalResult | null;
  boardFlipped?: boolean;
  /** Match board height on mobile */
  barHeight?: number;
  compact?: boolean;
}

const LIGHT = "#f0eee5";
const DARK = "#1f1d1b";

export const EvalBar: React.FC<EvalBarProps> = ({
  evalResult,
  boardFlipped = false,
  barHeight,
  compact = false,
}) => {
  let whitePercent = 50;

  if (evalResult) {
    if (evalResult.mate !== undefined) {
      whitePercent = evalResult.mate > 0 ? 95 : 5;
    } else {
      const cp = evalResult.cp ?? 0;
      const norm = normalizeEval(cp);
      whitePercent = 50 + norm / 2;
      whitePercent = Math.min(95, Math.max(5, whitePercent));
    }
  }

  const { text, favorable } = formatEvalForBoard(evalResult, boardFlipped);
  const segments = evalBarSegments(whitePercent, boardFlipped);

  const topColor = segments.topPlayer === "w" ? LIGHT : DARK;
  const bottomColor = segments.bottomPlayer === "w" ? LIGHT : DARK;

  const h = barHeight ?? (compact ? 280 : undefined);

  return (
    <div
      className={`flex flex-col items-center relative select-none flex-shrink-0 ${
        compact ? "w-5" : "w-7"
      }`}
      style={h ? { height: h } : compact ? undefined : { minHeight: 400 }}
    >
      <div
        className={`w-full flex-1 flex flex-col overflow-hidden rounded-sm border border-chess-border/80 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]`}
      >
        <div
          className="w-full transition-all duration-500 ease-in-out"
          style={{
            height: `${segments.topPct}%`,
            backgroundColor: topColor,
          }}
        />
        <div
          className="w-full transition-all duration-500 ease-in-out"
          style={{
            height: `${segments.bottomPct}%`,
            backgroundColor: bottomColor,
          }}
        />
      </div>
      <div
        className={`mt-1 font-mono font-semibold text-center leading-tight tabular-nums ${
          compact ? "text-[9px]" : "text-[10px]"
        }`}
      >
        <span style={{ color: favorable ? "#81b64c" : "#e84855" }}>{text}</span>
      </div>
    </div>
  );
};

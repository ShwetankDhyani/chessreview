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
  /** Flush with board — score inside bar, no outer label */
  integrated?: boolean;
}

const LIGHT = "#f0eee5";
const DARK = "#1f1d1b";

export const EvalBar: React.FC<EvalBarProps> = ({
  evalResult,
  boardFlipped = false,
  barHeight,
  compact = false,
  integrated = false,
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
  const scoreColor = favorable ? "#81b64c" : "#e84855";

  return (
    <div
      className={`relative select-none flex-shrink-0 ${
        integrated
          ? "w-3.5 h-full"
          : `flex flex-col items-center ${compact ? "w-5" : "w-7"}`
      }`}
      style={
        integrated
          ? undefined
          : h
            ? { height: h }
            : compact
              ? undefined
              : { minHeight: 400 }
      }
    >
      <div
        className={`w-full flex flex-col overflow-hidden ${
          integrated
            ? "h-full"
            : `flex-1 rounded-sm border border-chess-border/80 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]`
        }`}
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
      {integrated ? (
        <div
          className="absolute inset-x-0 bottom-2 flex justify-center pointer-events-none"
          aria-hidden
        >
          <span
            className="text-[7px] font-mono font-bold tabular-nums leading-none px-0.5 py-px rounded-sm"
            style={{
              color: scoreColor,
              background: "rgba(0,0,0,0.55)",
              textShadow: "0 0 4px rgba(0,0,0,0.8)",
            }}
          >
            {text}
          </span>
        </div>
      ) : (
        <div
          className={`mt-1 font-mono font-semibold text-center leading-tight tabular-nums ${
            compact ? "text-[9px]" : "text-[10px]"
          }`}
        >
          <span style={{ color: scoreColor }}>{text}</span>
        </div>
      )}
    </div>
  );
};

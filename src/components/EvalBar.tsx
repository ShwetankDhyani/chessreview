import React from "react";
import { normalizeEval } from "../engine/evaluationService";
import type { EvalResult } from "../types";

interface EvalBarProps {
  evalResult: EvalResult | null;
  boardFlipped?: boolean;
  /** Match board height on mobile */
  barHeight?: number;
  compact?: boolean;
}

export const EvalBar: React.FC<EvalBarProps> = ({
  evalResult,
  boardFlipped = false,
  barHeight,
  compact = false,
}) => {
  let displayText = "0.0";
  let whitePercent = 50;

  if (evalResult) {
    if (evalResult.mate !== undefined) {
      const m = evalResult.mate;
      displayText = m > 0 ? `M${m}` : `M${Math.abs(m)}`;
      whitePercent = m > 0 ? 95 : 5;
    } else {
      const cp = evalResult.cp ?? 0;
      const norm = normalizeEval(cp);
      whitePercent = 50 + norm / 2;
      whitePercent = Math.min(95, Math.max(5, whitePercent));
      const abs = Math.abs(cp / 100);
      displayText = abs.toFixed(1);
    }
  }

  const blackHeight = boardFlipped ? whitePercent : 100 - whitePercent;
  const whiteHeight = boardFlipped ? 100 - whitePercent : whitePercent;

  const h = barHeight ?? (compact ? 280 : undefined);

  return (
    <div
      className={`flex flex-col items-center relative select-none flex-shrink-0 ${
        compact ? "w-5" : "w-8"
      }`}
      style={h ? { height: h } : compact ? undefined : { minHeight: 400 }}
    >
      <div
        className={`w-full flex-1 flex flex-col rounded overflow-hidden border border-chess-border ${
          compact ? "" : "shadow-inner rounded-md"
        }`}
      >
        <div
          className="w-full transition-all duration-500 ease-in-out"
          style={{
            height: `${100 - whiteHeight}%`,
            backgroundColor: "#1a1a1a",
          }}
        />
        <div
          className="w-full transition-all duration-500 ease-in-out"
          style={{
            height: `${whiteHeight}%`,
            backgroundColor: "#e8e6e3",
          }}
        />
      </div>
      <div
        className={`mt-0.5 font-mono text-chess-subtext text-center leading-tight ${
          compact ? "text-[9px]" : "text-xs"
        }`}
      >
        {evalResult?.mate !== undefined ? (
          <span
            style={{
              color: evalResult.mate > 0 ? "#6daa6d" : "#ca3c3c",
            }}
          >
            {displayText}
          </span>
        ) : (
          displayText
        )}
      </div>
    </div>
  );
};

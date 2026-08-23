import React from "react";
import type { EvalResult } from "../types";
import {
  evalBarSegments,
  formatEvalForBoard,
  whiteWinPercentFromEval,
} from "../utils/evalDisplay";
import { MOBILE_LAYOUT } from "../utils/boardLayout";

interface EvalBarProps {
  evalResult: EvalResult | null;
  boardFlipped?: boolean;
  /** Match board height on mobile */
  barHeight?: number;
  compact?: boolean;
  /** Flush with board — score on the eval split line */
  integrated?: boolean;
  /** Width when integrated (mobile); defaults to MOBILE_LAYOUT.evalBar */
  integratedWidth?: number;
}

const LIGHT = "#f0eee5";
const DARK = "#1f1d1b";

/** Faint vertical shading so each side reads as a surface, not a flat block. */
const LIGHT_FILL =
  "linear-gradient(180deg, #f8f7f2 0%, #f0eee5 58%, #e3e0d5 100%)";
const DARK_FILL =
  "linear-gradient(180deg, #2b2825 0%, #1f1d1b 58%, #161413 100%)";

const fillFor = (color: string) => (color === LIGHT ? LIGHT_FILL : DARK_FILL);

export const EvalBar: React.FC<EvalBarProps> = ({
  evalResult,
  boardFlipped = false,
  barHeight,
  compact = false,
  integrated = false,
  integratedWidth = MOBILE_LAYOUT.evalBar,
}) => {
  const whitePercent = whiteWinPercentFromEval(evalResult);

  const { text, favorable } = formatEvalForBoard(evalResult, boardFlipped);
  const segments = evalBarSegments(whitePercent, boardFlipped);

  const topColor = segments.topPlayer === "w" ? LIGHT : DARK;
  const bottomColor = segments.bottomPlayer === "w" ? LIGHT : DARK;

  const h = barHeight ?? (compact ? 280 : undefined);
  const scoreColor = favorable ? "#81b64c" : "#e84855";
  const splitFromBottom = segments.bottomPct;

  return (
    <div
      className={`relative select-none flex-shrink-0 overflow-visible ${
        integrated
          ? "h-full"
          : `flex flex-col items-center ${compact ? "w-5" : "w-7"}`
      }`}
      style={
        integrated
          ? { width: integratedWidth, minWidth: integratedWidth }
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
            ? "h-full rounded-md border border-chess-hairline shadow-[inset_0_0_0_1px_rgba(0,0,0,0.2)]"
            : `flex-1 rounded-md border border-chess-hairline shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25),0_1px_3px_rgba(0,0,0,0.24)]`
        }`}
      >
        <div
          className="w-full transition-all duration-500 ease-in-out"
          style={{
            height: `${segments.topPct}%`,
            background: fillFor(topColor),
          }}
        />
        <div
          className="w-full transition-all duration-500 ease-in-out"
          style={{
            height: `${segments.bottomPct}%`,
            background: fillFor(bottomColor),
          }}
        />
      </div>
      {integrated ? (
        <div
          className="absolute left-1/2 z-20 flex -translate-x-1/2 pointer-events-none"
          style={{ bottom: `calc(${splitFromBottom}% - 0.55rem)` }}
          aria-hidden
        >
          <span
            className="text-[8px] font-mono font-bold tabular-nums leading-none whitespace-nowrap px-1.5 py-0.5 rounded-full backdrop-blur-[2px]"
            style={{
              color: scoreColor,
              background: "rgba(0,0,0,0.74)",
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.08), 0 2px 6px -1px rgba(0,0,0,0.45)",
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

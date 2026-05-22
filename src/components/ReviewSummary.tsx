import React, { useState } from "react";
import type { ReviewSummary as ReviewSummaryType, AnalyzedMove } from "../types";
import { AccuracyWheel } from "./AccuracyWheel";
import { CLASSIFICATION_META } from "../utils/classificationMeta";
import { ClassificationIcon } from "./ClassificationIcon";

interface ReviewSummaryProps {
  summary: ReviewSummaryType;
  whiteName?: string;
  blackName?: string;
  moves?: AnalyzedMove[];
  onMoveClick?: (idx: number) => void;
}

const ROWS: Array<keyof typeof CLASSIFICATION_META> = [
  "brilliant",
  "great",
  "best",
  "excellent",
  "good",
  "book",
  "inaccuracy",
  "mistake",
  "blunder",
];

export const ReviewSummaryPanel: React.FC<ReviewSummaryProps> = ({
  summary,
  whiteName,
  blackName,
  moves = [],
  onMoveClick,
}) => {
  // Track which cell is expanded: `${key}-${"w"|"b"}` or null
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (key: string) => setExpanded(prev => prev === key ? null : key);

  // Get move indices for a given classification + color
  const getMovesFor = (classification: string, color: "w" | "b") =>
    moves.reduce<Array<{ idx: number; move: AnalyzedMove }>>((acc, m, i) => {
      if (m.classification === classification && m.color === color) acc.push({ idx: i, move: m });
      return acc;
    }, []);

  return (
    <div className="flex flex-col gap-4 p-4 animate-fade-in">
      <div className="flex justify-around gap-2 py-1">
        <AccuracyWheel
          accuracy={summary.accuracy.white}
          color="white"
          username={whiteName}
        />
        <div className="w-px bg-chess-border self-stretch" />
        <AccuracyWheel
          accuracy={summary.accuracy.black}
          color="black"
          username={blackName}
        />
      </div>

      <div className="border-t border-chess-border pt-3">
        <div
          className="grid gap-x-2 mb-2 min-w-0"
          style={{ gridTemplateColumns: "minmax(2.25rem, 1fr) minmax(5.5rem, auto) minmax(2.25rem, 1fr)" }}
        >
          <span className="text-[10px] sm:text-xs text-chess-muted font-semibold uppercase tracking-wider text-right truncate">White</span>
          <span className="text-[10px] sm:text-xs text-chess-muted font-semibold uppercase tracking-wider text-center whitespace-nowrap">Type</span>
          <span className="text-[10px] sm:text-xs text-chess-muted font-semibold uppercase tracking-wider text-left truncate">Black</span>
        </div>

        <div className="space-y-0.5 min-w-0">
          {ROWS.map((key) => {
            const meta = CLASSIFICATION_META[key];
            const whiteCount = (summary.white as unknown as Record<string, number>)[key] ?? 0;
            const blackCount = (summary.black as unknown as Record<string, number>)[key] ?? 0;
            const wKey = `${key}-w`;
            const bKey = `${key}-b`;

            return (
              <React.Fragment key={key}>
                <div
                  className="grid items-center gap-x-1.5 sm:gap-x-2 py-1.5 px-1.5 sm:px-2 rounded bg-chess-bg/30 min-w-0"
                  style={{ gridTemplateColumns: "minmax(2.25rem, 1fr) minmax(5.5rem, auto) minmax(2.25rem, 1fr)" }}
                >
                  <div className="flex justify-end min-w-0">
                    <CountBadge
                      count={whiteCount}
                      color={meta.color}
                      active={expanded === wKey}
                      onClick={() => whiteCount > 0 && onMoveClick && toggle(wKey)}
                      clickable={whiteCount > 0 && !!onMoveClick}
                    />
                  </div>
                  <div className="flex items-center justify-center gap-1 min-w-0">
                    <ClassificationIcon type={key} size="xs" />
                    <span
                      className="text-[10px] sm:text-xs font-medium truncate whitespace-nowrap"
                      style={{ color: meta.color }}
                      title={meta.label}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <div className="flex justify-start min-w-0">
                    <CountBadge
                      count={blackCount}
                      color={meta.color}
                      active={expanded === bKey}
                      onClick={() => blackCount > 0 && onMoveClick && toggle(bKey)}
                      clickable={blackCount > 0 && !!onMoveClick}
                    />
                  </div>
                </div>

                {/* Expanded move list for white */}
                {expanded === wKey && (
                  <MoveDropdown
                    movesForType={getMovesFor(key, "w")}
                    color={meta.color}
                    onMoveClick={(idx) => { onMoveClick?.(idx); setExpanded(null); }}
                  />
                )}
                {/* Expanded move list for black */}
                {expanded === bKey && (
                  <MoveDropdown
                    movesForType={getMovesFor(key, "b")}
                    color={meta.color}
                    onMoveClick={(idx) => { onMoveClick?.(idx); setExpanded(null); }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      {/* Phase accuracy */}
      {summary.phaseAccuracy && (
        <div className="border-t border-chess-border pt-3 mt-1">
          <div className="text-xs text-chess-muted font-semibold uppercase tracking-wider mb-2 px-1">Phase Accuracy</div>
          <div className="space-y-2 px-1">
            {(["opening", "middlegame", "endgame"] as const).map(phase => {
              const pa = summary.phaseAccuracy![phase];
              const label = phase.charAt(0).toUpperCase() + phase.slice(1);
              const icon = phase === "opening" ? "📖" : phase === "middlegame" ? "⚔️" : "👑";
              return (
                <div key={phase}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs">{icon}</span>
                    <span className="text-xs text-chess-subtext font-medium">{label}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <PhaseBar value={pa.white} label="W" />
                    <PhaseBar value={pa.black} label="B" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Key moments */}
      {summary.keyMoments && summary.keyMoments.length > 0 && onMoveClick && (
        <div className="border-t border-chess-border pt-3 mt-1">
          <div className="text-xs text-chess-muted font-semibold uppercase tracking-wider mb-2 px-1">
            ⚡ Key Moments
          </div>
          <div className="flex flex-wrap gap-1 px-1">
            {summary.keyMoments.map((km, i) => {
              const meta = km.classification ? CLASSIFICATION_META[km.classification as keyof typeof CLASSIFICATION_META] : null;
              const color = meta?.color ?? (km.swing >= 2 ? "#ca3c3c" : "#e6c84a");
              return (
                <button
                  key={i}
                  onClick={() => onMoveClick(km.moveIdx)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-all hover:scale-105 hover:brightness-125"
                  style={{
                    backgroundColor: `${color}18`,
                    color,
                    border: `1px solid ${color}33`,
                  }}
                  title={`${km.moveNumber}${km.color === "w" ? "." : "..."} ${km.san} — ${km.classification ?? "critical"} (±${km.swing.toFixed(1)})`}
                >
                  {km.classification && <ClassificationIcon type={km.classification} size="xs" />}
                  <span>{km.moveNumber}{km.color === "w" ? "." : "…"}{km.san}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const CountBadge: React.FC<{
  count: number;
  color: string;
  active?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}> = ({ count, color, active, clickable, onClick }) => (
  <button
    onClick={onClick}
    disabled={!clickable}
    className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded transition-all ${
      clickable ? "cursor-pointer hover:scale-110" : "cursor-default"
    } ${active ? "ring-1 ring-offset-1 ring-offset-chess-bg" : ""}`}
    style={{
      backgroundColor: active ? `${color}44` : count > 0 ? `${color}22` : "transparent",
      color: count > 0 ? color : "#444",
      outline: active ? `1px solid ${color}88` : undefined,
    }}
  >
    {count}
  </button>
);

const MoveDropdown: React.FC<{
  movesForType: Array<{ idx: number; move: AnalyzedMove }>;
  color: string;
  onMoveClick: (idx: number) => void;
}> = ({ movesForType, color, onMoveClick }) => (
  <div
    className="mx-2 mb-1 rounded overflow-hidden border"
    style={{ borderColor: `${color}44`, backgroundColor: `${color}08` }}
  >
    {movesForType.map(({ idx, move }) => {
      const moveNum = Math.floor(idx / 2) + 1;
      const isBlack = move.color === "b";
      return (
        <button
          key={idx}
          onClick={() => onMoveClick(idx)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-chess-hover transition-colors text-left"
        >
          <span className="text-chess-muted font-mono w-8 flex-shrink-0">
            {moveNum}{isBlack ? "…" : "."}
          </span>
          <span className="font-bold font-mono" style={{ color }}>{move.san}</span>
          {move.evalAfter?.cp !== undefined && (
            <span className="ml-auto text-chess-muted font-mono text-xs">
              {move.evalAfter.cp > 0 ? "+" : ""}{(move.evalAfter.cp / 100).toFixed(1)}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

const PhaseBar: React.FC<{ value: number; label: string }> = ({ value, label }) => {
  const color = value >= 85 ? "#6daa6d" : value >= 65 ? "#e6c84a" : value >= 45 ? "#e07b39" : "#ca3c3c";
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-chess-muted w-3 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-chess-bg/60 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono w-9 text-right" style={{ color }}>
        {value.toFixed(0)}%
      </span>
    </div>
  );
};

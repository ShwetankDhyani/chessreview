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

const PHASE_LABELS: Record<"opening" | "middlegame" | "endgame", string> = {
  opening: "Opening",
  middlegame: "Middlegame",
  endgame: "Endgame",
};

const MOVE_GRID =
  "minmax(2.25rem, 1fr) minmax(5.5rem, auto) minmax(2.25rem, 1fr)";

function accuracyStrokeColor(value: number): string {
  if (value >= 85) return "#6daa6d";
  if (value >= 65) return "#e6c84a";
  if (value >= 45) return "#e07b39";
  return "#ca3c3c";
}

function ReviewSection({
  title,
  children,
  first = false,
}: {
  title: string;
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <section
      className={first ? "" : "pt-4 mt-4 border-t border-chess-border/50"}
    >
      <h3 className="text-[10px] text-chess-muted font-semibold uppercase tracking-wider mb-3">
        {title}
      </h3>
      {children}
    </section>
  );
}

export const ReviewSummaryPanel: React.FC<ReviewSummaryProps> = ({
  summary,
  whiteName,
  blackName,
  moves = [],
  onMoveClick,
}) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const toggle = (key: string) =>
    setExpanded((prev) => (prev === key ? null : key));

  const wLabel = whiteName ?? "White";
  const bLabel = blackName ?? "Black";

  const getMovesFor = (classification: string, color: "w" | "b") =>
    moves.reduce<Array<{ idx: number; move: AnalyzedMove }>>((acc, m, i) => {
      if (m.classification === classification && m.color === color) {
        acc.push({ idx: i, move: m });
      }
      return acc;
    }, []);

  const wAcc = summary.accuracy.white;
  const bAcc = summary.accuracy.black;
  const accGap = Math.abs(wAcc - bAcc);
  const accLeader: "white" | "black" | null =
    accGap < 0.5 ? null : wAcc >= bAcc ? "white" : "black";

  return (
    <div className="flex flex-col p-3 sm:p-4 animate-fade-in">
      <ReviewPlayerStrip whiteName={wLabel} blackName={bLabel} />

      <ReviewSection title="Overall accuracy" first>
        <div className="flex items-stretch gap-1">
          <AccuracyWheel
            accuracy={wAcc}
            color="white"
            showName={false}
          />
          <div className="flex flex-col items-center justify-center px-1.5 min-w-[2.75rem]">
            <span className="text-[9px] text-chess-muted uppercase tracking-wider">
              Gap
            </span>
            <span
              className={`text-sm font-bold tabular-nums ${
                accLeader ? "text-chess-accent" : "text-chess-muted"
              }`}
            >
              {accGap.toFixed(0)}%
            </span>
            {accLeader && (
              <PieceIndicator side={accLeader} className="mt-1 h-3 w-3" />
            )}
          </div>
          <AccuracyWheel
            accuracy={bAcc}
            color="black"
            showName={false}
          />
        </div>
      </ReviewSection>

      <ReviewSection title="Move breakdown">
        <div
          className="grid gap-x-2 mb-2 min-w-0"
          style={{ gridTemplateColumns: MOVE_GRID }}
        >
          <div className="flex justify-end pr-1">
            <PieceIndicator side="white" />
          </div>
          <span className="text-[10px] text-chess-muted font-semibold uppercase tracking-wider text-center self-center">
            Type
          </span>
          <div className="flex justify-start pl-1">
            <PieceIndicator side="black" />
          </div>
        </div>

        <div className="space-y-px min-w-0">
          {ROWS.map((key) => {
            const meta = CLASSIFICATION_META[key];
            const whiteCount =
              (summary.white as unknown as Record<string, number>)[key] ?? 0;
            const blackCount =
              (summary.black as unknown as Record<string, number>)[key] ?? 0;
            const wKey = `${key}-w`;
            const bKey = `${key}-b`;

            return (
              <React.Fragment key={key}>
                <div
                  className="grid items-center gap-x-1.5 sm:gap-x-2 py-1.5 min-w-0 hover:bg-chess-hover/25 rounded-md transition-colors"
                  style={{ gridTemplateColumns: MOVE_GRID }}
                >
                  <div className="flex justify-end min-w-0 pr-1 border-r border-chess-border/25">
                    <CountBadge
                      count={whiteCount}
                      color={meta.color}
                      active={expanded === wKey}
                      onClick={() =>
                        whiteCount > 0 && onMoveClick && toggle(wKey)
                      }
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
                  <div className="flex justify-start min-w-0 pl-1 border-l border-chess-border/25">
                    <CountBadge
                      count={blackCount}
                      color={meta.color}
                      active={expanded === bKey}
                      onClick={() =>
                        blackCount > 0 && onMoveClick && toggle(bKey)
                      }
                      clickable={blackCount > 0 && !!onMoveClick}
                    />
                  </div>
                </div>

                {expanded === wKey && (
                  <MoveDropdown
                    movesForType={getMovesFor(key, "w")}
                    color={meta.color}
                    onMoveClick={(idx) => {
                      onMoveClick?.(idx);
                      setExpanded(null);
                    }}
                  />
                )}
                {expanded === bKey && (
                  <MoveDropdown
                    movesForType={getMovesFor(key, "b")}
                    color={meta.color}
                    onMoveClick={(idx) => {
                      onMoveClick?.(idx);
                      setExpanded(null);
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </ReviewSection>

      {summary.phaseAccuracy && (
        <ReviewSection title="Phase accuracy">
          <div className="space-y-4">
            {(["opening", "middlegame", "endgame"] as const).map((phase) => {
              const pa = summary.phaseAccuracy![phase];
              return (
                <PhaseCompareRow
                  key={phase}
                  label={PHASE_LABELS[phase]}
                  white={pa.white}
                  black={pa.black}
                />
              );
            })}
          </div>
        </ReviewSection>
      )}

      {summary.keyMoments && summary.keyMoments.length > 0 && onMoveClick && (
        <ReviewSection title="Key moments">
          <div className="flex flex-wrap gap-1.5">
            {summary.keyMoments.map((km, i) => {
              const meta = km.classification
                ? CLASSIFICATION_META[
                    km.classification as keyof typeof CLASSIFICATION_META
                  ]
                : null;
              const color =
                meta?.color ?? (km.swing >= 2 ? "#ca3c3c" : "#e6c84a");
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onMoveClick(km.moveIdx)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono transition-all hover:brightness-110"
                  style={{
                    backgroundColor: `${color}18`,
                    color,
                    border: `1px solid ${color}33`,
                  }}
                  title={`${km.moveNumber}${km.color === "w" ? "." : "..."} ${km.san} — ${km.classification ?? "critical"} (±${km.swing.toFixed(1)})`}
                >
                  {km.classification && (
                    <ClassificationIcon type={km.classification} size="xs" />
                  )}
                  <span>
                    {km.moveNumber}
                    {km.color === "w" ? "." : "…"}
                    {km.san}
                  </span>
                </button>
              );
            })}
          </div>
        </ReviewSection>
      )}
    </div>
  );
};

const PieceIndicator: React.FC<{
  side: "white" | "black";
  className?: string;
}> = ({ side, className = "h-3.5 w-3.5" }) => (
  <span
    className={`rounded-full flex-shrink-0 inline-block ${className}`}
    style={{
      background:
        side === "white"
          ? "linear-gradient(145deg, #f5f3f0 0%, #d8d6d3 100%)"
          : "linear-gradient(145deg, #3d3d3d 0%, #1a1a1a 100%)",
      border:
        side === "white"
          ? "1.5px solid rgba(255,255,255,0.35)"
          : "1.5px solid rgba(255,255,255,0.12)",
      boxShadow:
        side === "white"
          ? "0 1px 2px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.5)"
          : "0 1px 2px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.06)",
    }}
    aria-hidden
  />
);

const ReviewPlayerStrip: React.FC<{
  whiteName: string;
  blackName: string;
}> = ({ whiteName, blackName }) => (
  <div className="flex items-center justify-between gap-3 pb-2.5 mb-0.5 border-b border-chess-border/35">
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <PieceIndicator side="white" className="h-3 w-3 opacity-80" />
      <span className="text-xs font-medium text-chess-muted truncate tracking-wide">
        {whiteName}
      </span>
    </div>
    <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
      <span className="text-xs font-medium text-chess-muted truncate text-right tracking-wide">
        {blackName}
      </span>
      <PieceIndicator side="black" className="h-3 w-3 opacity-80" />
    </div>
  </div>
);

const PhaseCompareRow: React.FC<{
  label: string;
  white: number;
  black: number;
}> = ({ label, white, black }) => {
  const gap = Math.abs(white - black);
  const leader: "white" | "black" | null =
    gap < 1 ? null : white >= black ? "white" : "black";
  const wColor = accuracyStrokeColor(white);
  const bColor = accuracyStrokeColor(black);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs text-chess-subtext font-medium">{label}</span>
        {leader ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-chess-muted tabular-nums">
            +{gap.toFixed(0)}%
            <PieceIndicator side={leader} className="h-2.5 w-2.5" />
          </span>
        ) : (
          <span className="text-[10px] text-chess-muted">Even</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-0">
        <PhaseSide
          value={white}
          color={wColor}
          highlight={leader === "white"}
        />
        <PhaseSide
          value={black}
          color={bColor}
          highlight={leader === "black"}
          align="right"
        />
      </div>
    </div>
  );
};

const PhaseSide: React.FC<{
  value: number;
  color: string;
  highlight?: boolean;
  align?: "left" | "right";
}> = ({ value, color, highlight, align = "left" }) => (
  <div
    className={`px-2 py-1 ${
      align === "right" ? "text-right border-l" : "text-left border-r"
    } border-chess-border/25`}
  >
    <span
      className="text-sm font-bold tabular-nums block mb-1"
      style={{ color: value > 0 ? color : "#555" }}
    >
      {value > 0 ? `${value.toFixed(0)}%` : "—"}
    </span>
    <div
      className={`h-1.5 rounded-full bg-chess-border/40 overflow-hidden flex ${
        align === "right" ? "justify-end" : ""
      } ${highlight ? "ring-1 ring-chess-accent/30" : ""}`}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          backgroundColor: color,
        }}
      />
    </div>
  </div>
);

const CountBadge: React.FC<{
  count: number;
  color: string;
  active?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}> = ({ count, color, active, clickable, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!clickable}
    className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded transition-all ${
      clickable ? "cursor-pointer hover:scale-110" : "cursor-default"
    } ${active ? "ring-1 ring-offset-1 ring-offset-chess-bg" : ""}`}
    style={{
      backgroundColor: active
        ? `${color}44`
        : count > 0
          ? `${color}22`
          : "transparent",
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
    className="mx-1 mb-1 rounded overflow-hidden"
    style={{ backgroundColor: `${color}0c` }}
  >
    {movesForType.map(({ idx, move }) => {
      const moveNum = Math.floor(idx / 2) + 1;
      const isBlack = move.color === "b";
      return (
        <button
          key={idx}
          type="button"
          onClick={() => onMoveClick(idx)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-chess-hover/50 transition-colors text-left"
        >
          <span className="text-chess-muted font-mono w-8 flex-shrink-0">
            {moveNum}
            {isBlack ? "…" : "."}
          </span>
          <span className="font-bold font-mono" style={{ color }}>
            {move.san}
          </span>
          {move.evalAfter?.cp !== undefined && (
            <span className="ml-auto text-chess-muted font-mono text-xs">
              {move.evalAfter.cp > 0 ? "+" : ""}
              {(move.evalAfter.cp / 100).toFixed(1)}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

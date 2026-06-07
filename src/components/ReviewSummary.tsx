import React, { useState } from "react";
import type {
  ReviewSummary as ReviewSummaryType,
  AnalyzedMove,
  ReviewRun,
} from "../types";
import { AccuracyWheel } from "./AccuracyWheel";
import { CLASSIFICATION_META } from "../utils/classificationMeta";
import { ClassificationIcon } from "./ClassificationIcon";

interface ReviewSummaryProps {
  summary: ReviewSummaryType;
  whiteName?: string;
  blackName?: string;
  moves?: AnalyzedMove[];
  run?: ReviewRun | null;
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
  run = null,
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
      {summary.coverage && (
        <div className="mb-3 rounded-md border border-chess-border bg-chess-bg/60 px-2.5 py-2 text-[11px] text-chess-muted">
          <span className="font-semibold text-chess-text">
            Verified {summary.coverage.verifiedPlies}/{summary.coverage.totalPlies} plies
          </span>
          {summary.coverage.unverifiedPlies > 0 && (
            <span className="ml-1 text-amber-300">
              ({summary.coverage.unverifiedPlies} unverified)
            </span>
          )}
          {run && (
            <span className="ml-2 text-chess-subtext">
              · D{run.requestedDepth} · {run.engineVersion}
            </span>
          )}
          {summary.accuracyMeta?.formulaVersion && (
            <span className="ml-2 text-chess-subtext">
              · {summary.accuracyMeta.formulaVersion}
            </span>
          )}
        </div>
      )}
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
  <div className="flex items-center justify-between gap-3 pb-3 mb-1 border-b border-chess-border/45">
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <PieceIndicator side="white" />
      <span className="text-sm font-medium text-chess-subtext truncate">
        {whiteName}
      </span>
    </div>
    <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
      <span className="text-sm font-medium text-chess-subtext truncate text-right">
        {blackName}
      </span>
      <PieceIndicator side="black" />
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

import React, { useEffect, useMemo, useState } from "react";
import type {
  ReviewSummary as ReviewSummaryType,
  AnalyzedMove,
  ReviewRun,
  PhaseAccuracyStats,
} from "../types";
import { AccuracyWheel } from "./AccuracyWheel";
import { CLASSIFICATION_META } from "../utils/classificationMeta";
import { ClassificationIcon } from "./ClassificationIcon";
import { ShareReviewActions } from "./ShareReviewActions";
import { computePhaseAccuracies } from "../analysis/gamePhases";
import { caps2AccuracyForMoves } from "../analysis/caps2Accuracy";
import { pickCriticalMoments } from "../utils/criticalMoments";
import {
  formatWinChanceDelta,
  moverWinChanceDeltaPercent,
} from "../utils/evalDisplay";
import { getMeta } from "../utils/classificationMeta";
import { hapticTap, hapticToggle } from "../utils/chessSounds";
import { safeGetItem, safeSetItem } from "../utils/safeStorage";

const ACCURACY_EXCLUDE_KEY = "cr_accuracy_exclude_book_forced";

function readExcludePref(): boolean {
  try {
    return safeGetItem(ACCURACY_EXCLUDE_KEY) === "1";
  } catch {
    return false;
  }
}

interface ReviewSummaryProps {
  summary: ReviewSummaryType;
  whiteName?: string;
  blackName?: string;
  moves?: AnalyzedMove[];
  run?: ReviewRun | null;
  onMoveClick?: (idx: number) => void;
  onShare?: () => void;
  sharing?: boolean;
  shareUrl?: string | null;
  shareError?: string | null;
}

const ROWS: Array<keyof typeof CLASSIFICATION_META> = [
  "best",
  "good",
  "book",
  "inaccuracy",
  "mistake",
  "blunder",
];

const MOVE_GRID =
  "minmax(2.25rem, 1fr) minmax(5.5rem, auto) minmax(2.25rem, 1fr)";

/** Match AccuracyWheel tone bands for serious report-card readouts. */
function accuracyTone(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "#666";
  if (value >= 90) return "#6daa6d";
  if (value >= 75) return "#96bc6c";
  if (value >= 60) return "#e6c84a";
  if (value >= 40) return "#e07b39";
  return "#ca3c3c";
}

function formatPhaseAccuracy(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(1);
}

const PHASE_ROWS: Array<{
  key: keyof PhaseAccuracyStats;
  label: string;
}> = [
  { key: "opening", label: "Opening" },
  { key: "middlegame", label: "Middlegame" },
  { key: "endgame", label: "Endgame" },
];

const PHASE_GRID =
  "minmax(2.25rem, 1fr) minmax(5.5rem, auto) minmax(2.25rem, 1fr)";

const PhaseAccuracyTable: React.FC<{ phases: PhaseAccuracyStats }> = ({
  phases,
}) => (
  <div className="min-w-0">
    <div
      className="grid gap-x-2 mb-1.5 min-w-0"
      style={{ gridTemplateColumns: PHASE_GRID }}
    >
      <div className="flex justify-end pr-1">
        <PieceIndicator side="white" />
      </div>
      <span className="text-[10px] text-chess-muted font-semibold uppercase tracking-wider text-center self-center">
        Phase
      </span>
      <div className="flex justify-start pl-1">
        <PieceIndicator side="black" />
      </div>
    </div>

    <div className="space-y-px min-w-0">
      {PHASE_ROWS.map(({ key, label }) => {
        const row = phases[key];
        return (
          <div
            key={key}
            className="grid items-center gap-x-1.5 sm:gap-x-2 py-2 min-w-0 rounded-md"
            style={{ gridTemplateColumns: PHASE_GRID }}
          >
            <div className="flex justify-end min-w-0 pr-1 border-r border-chess-hairline">
              <span
                className="text-sm font-bold tabular-nums tracking-tight"
                style={{ color: accuracyTone(row.white) }}
              >
                {formatPhaseAccuracy(row.white)}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center min-w-0 px-0.5">
              <span className="text-xs font-medium text-chess-text tracking-tight">
                {label}
              </span>
            </div>
            <div className="flex justify-start min-w-0 pl-1 border-l border-chess-hairline">
              <span
                className="text-sm font-bold tabular-nums tracking-tight"
                style={{ color: accuracyTone(row.black) }}
              >
                {formatPhaseAccuracy(row.black)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

function AccuracyExcludeToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div
      className={`mt-3 rounded-xl border px-3 py-2.5 shadow-elev-1 transition-all duration-200 ease-soft ${
        checked
          ? "border-chess-accent/40 bg-chess-accent/[0.09]"
          : "border-chess-hairline bg-chess-surface/80"
      }`}
    >
      <div className="flex items-center gap-3 min-h-[2.5rem]">
        <div className="min-w-0 flex-1">
          <p
            className={`text-[11px] font-semibold leading-snug tracking-tight ${
              checked ? "text-chess-accent" : "text-chess-text"
            }`}
          >
            Exclude book &amp; forced moves
          </p>
          <p className="mt-0.5 text-[10px] leading-snug text-chess-muted">
            Applies to overall &amp; phase accuracy
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label="Exclude book and forced moves from accuracy"
          onClick={() => { hapticToggle(); onChange(!checked); }}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.22)] transition-colors duration-200 ease-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chess-accent/50 ${
            checked ? "bg-chess-accent" : "bg-chess-border-strong"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.35)] transition-transform duration-200 ease-soft ${
              checked ? "translate-x-[22px]" : "translate-x-[3px]"
            }`}
          />
        </button>
      </div>
    </div>
  );
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
      className={first ? "" : "pt-5 mt-5 border-t border-chess-hairline"}
    >
      <h3 className="text-[10px] text-chess-muted font-semibold uppercase tracking-[0.13em] mb-3">
        {title}
      </h3>
      {children}
    </section>
  );
}

function ReviewPlayersHeader({
  whiteName,
  blackName,
}: {
  whiteName: string;
  blackName: string;
}) {
  return (
    <div className="flex items-center justify-center gap-4 sm:gap-8 pb-4">
      <div className="flex flex-col items-center min-w-0 flex-1 max-w-[9rem]">
        <span
          className="text-[1.75rem] leading-none select-none"
          style={{
            color: "#f0ede8",
            textShadow: "0 1px 2px rgba(0,0,0,0.45)",
          }}
          aria-hidden
        >
          ♔
        </span>
        <span className="mt-2 text-sm font-semibold text-chess-text truncate w-full text-center">
          {whiteName}
        </span>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-chess-muted flex-shrink-0">
        vs
      </span>
      <div className="flex flex-col items-center min-w-0 flex-1 max-w-[9rem]">
        <span
          className="text-[1.75rem] leading-none select-none"
          style={{
            color: "#9a9a9a",
            textShadow: "0 1px 2px rgba(0,0,0,0.55)",
          }}
          aria-hidden
        >
          ♚
        </span>
        <span className="mt-2 text-sm font-semibold text-chess-text truncate w-full text-center">
          {blackName}
        </span>
      </div>
    </div>
  );
}

export const ReviewSummaryPanel: React.FC<ReviewSummaryProps> = ({
  summary,
  whiteName,
  blackName,
  moves = [],
  run: _run = null,
  onMoveClick,
  onShare,
  sharing = false,
  shareUrl = null,
  shareError = null,
}) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [excludeBookAndForced, setExcludeBookAndForced] = useState(readExcludePref);
  const toggle = (key: string) =>
    setExpanded((prev) => (prev === key ? null : key));

  useEffect(() => {
    try {
      safeSetItem(
        ACCURACY_EXCLUDE_KEY,
        excludeBookAndForced ? "1" : "0"
      );
    } catch {
      /* ignore */
    }
  }, [excludeBookAndForced]);

  const wLabel = whiteName ?? "White";
  const bLabel = blackName ?? "Black";

  const getMovesFor = (classification: string, color: "w" | "b") =>
    moves.reduce<Array<{ idx: number; move: AnalyzedMove }>>((acc, m, i) => {
      if (m.classification === classification && m.color === color) {
        acc.push({ idx: i, move: m });
      }
      return acc;
    }, []);

  const accuracyOpts = useMemo(
    () => ({ excludeBookAndForced }),
    [excludeBookAndForced]
  );

  const wAcc = useMemo(() => {
    if (moves.length) {
      return caps2AccuracyForMoves(moves, "w", accuracyOpts);
    }
    return summary.accuracy.white;
  }, [moves, summary.accuracy.white, accuracyOpts]);

  const bAcc = useMemo(() => {
    if (moves.length) {
      return caps2AccuracyForMoves(moves, "b", accuracyOpts);
    }
    return summary.accuracy.black;
  }, [moves, summary.accuracy.black, accuracyOpts]);

  const accGap = Math.abs(wAcc - bAcc);
  const nearTie = accGap < 1;
  const accLeader: "white" | "black" | null =
    nearTie ? null : wAcc >= bAcc ? "white" : "black";

  const phaseAccuracy: PhaseAccuracyStats = useMemo(
    () => computePhaseAccuracies(moves, accuracyOpts),
    [moves, accuracyOpts]
  );

  const criticalMoments = useMemo(
    () => pickCriticalMoments(moves, 6),
    [moves]
  );

  return (
    <div className="flex flex-col min-h-full p-3 sm:p-4 animate-fade-in">
      <ReviewPlayersHeader whiteName={wLabel} blackName={bLabel} />

      <ReviewSection title="Overall accuracy" first>
        <div className="flex items-stretch gap-1">
          <AccuracyWheel
            accuracy={wAcc}
            color="white"
            showName={false}
          />
          <div className="flex flex-col items-center justify-center px-1.5 min-w-[3.25rem]">
            <span className="text-[9px] text-chess-muted uppercase tracking-wider">
              Gap
            </span>
            {nearTie ? (
              <span className="text-[11px] font-semibold text-chess-muted leading-tight text-center mt-0.5">
                So close
              </span>
            ) : (
              <span className="text-sm font-bold tabular-nums text-chess-accent">
                {accGap.toFixed(0)}%
              </span>
            )}
            {accLeader ? (
              <PieceIndicator side={accLeader} className="mt-1 h-3 w-3" />
            ) : (
              <span className="mt-1 h-3 w-3" aria-hidden />
            )}
          </div>
          <AccuracyWheel
            accuracy={bAcc}
            color="black"
            showName={false}
          />
        </div>
        <AccuracyExcludeToggle
          checked={excludeBookAndForced}
          onChange={setExcludeBookAndForced}
        />
      </ReviewSection>

      <ReviewSection title="Phase accuracy">
        <PhaseAccuracyTable phases={phaseAccuracy} />
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
                  className="grid items-center gap-x-1.5 sm:gap-x-2 py-1.5 min-w-0 hover:bg-chess-hover/25 rounded-lg transition-colors duration-200 ease-soft"
                  style={{ gridTemplateColumns: MOVE_GRID }}
                >
                  <div className="flex justify-end min-w-0 pr-1 border-r border-chess-hairline">
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
                  <div className="flex justify-start min-w-0 pl-1 border-l border-chess-hairline">
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

      {criticalMoments.length > 0 && (
        <ReviewSection title="Critical moments">
          <CriticalMomentsList
            moments={criticalMoments}
            onMoveClick={onMoveClick}
          />
        </ReviewSection>
      )}

      {onShare && (
        <div className="mt-auto pt-5 border-t border-chess-hairline space-y-2">
          <button
            type="button"
            onClick={() => { hapticTap(); onShare?.(); }}
            disabled={sharing}
            className="w-full text-xs font-semibold tracking-tight py-2.5 rounded-lg border border-chess-hairline bg-chess-surface/60 shadow-elev-1 transition-all duration-200 ease-soft hover:bg-chess-hover hover:border-chess-border-strong active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
          >
            {sharing ? "Creating link…" : "Share this review"}
          </button>
          {shareUrl && (
            <ShareReviewActions
              url={shareUrl}
              whiteName={wLabel}
              blackName={bLabel}
              whiteAccuracy={wAcc}
              blackAccuracy={bAcc}
            />
          )}
          {shareError && <p className="text-[11px] text-red-400">{shareError}</p>}
        </div>
      )}
    </div>
  );
};

const CriticalMomentsList: React.FC<{
  moments: ReturnType<typeof pickCriticalMoments>;
  onMoveClick?: (idx: number) => void;
}> = ({ moments, onMoveClick }) => (
  <div className="space-y-0.5">
    {moments.map(({ idx, move, swingPct }) => {
      const meta = getMeta(move.classification);
      const signed = formatWinChanceDelta(
        moverWinChanceDeltaPercent(move)
      );
      const moveNum = move.moveNumber;
      const label =
        move.color === "w"
          ? `${moveNum}. ${move.san}`
          : `${moveNum}… ${move.san}`;
      return (
        <button
          key={idx}
          type="button"
          disabled={!onMoveClick}
          onClick={() => onMoveClick?.(idx)}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors duration-200 ease-soft ${
            onMoveClick ? "hover:bg-chess-hover/40 cursor-pointer" : ""
          }`}
        >
          {move.classification && (
            <ClassificationIcon type={move.classification} size="xs" />
          )}
          <span className="font-mono text-xs font-semibold text-chess-text truncate">
            {label}
          </span>
          <span
            className="text-[10px] font-medium truncate"
            style={{ color: meta?.color }}
          >
            {meta?.label}
          </span>
          <span
            className={`ml-auto text-xs font-mono font-bold tabular-nums ${
              swingPct >= 8 ? "text-chess-text" : "text-chess-muted"
            }`}
          >
            {signed}
          </span>
        </button>
      );
    })}
  </div>
);

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
    className={`w-6 h-6 flex items-center justify-center text-xs font-bold tabular-nums rounded-md transition-all duration-200 ease-soft ${
      clickable
        ? "cursor-pointer hover:scale-105 hover:brightness-125 active:scale-95"
        : "cursor-default"
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
    className="mx-1 mb-1 rounded-lg overflow-hidden"
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
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-chess-hover/50 transition-colors duration-200 ease-soft text-left"
        >
          <span className="text-chess-muted font-mono tabular-nums w-8 flex-shrink-0">
            {moveNum}
            {isBlack ? "…" : "."}
          </span>
          <span className="font-bold font-mono" style={{ color }}>
            {move.san}
          </span>
          {move.evalAfter?.cp !== undefined && (
            <span className="ml-auto text-chess-muted font-mono tabular-nums text-xs">
              {move.evalAfter.cp > 0 ? "+" : ""}
              {(move.evalAfter.cp / 100).toFixed(1)}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

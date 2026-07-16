import React, { useState, useEffect, useMemo, useRef } from "react";
import { Chess } from "chess.js";
import type { AnalyzedMove, EvalResult } from "../types";
import { getMeta } from "../utils/classificationMeta";
import { ClassificationIcon } from "./ClassificationIcon";
import { CoachIcon } from "./CoachIcon";
import { OpeningChapter } from "./OpeningChapter";
import {
  openingHintForMove,
  computeOpeningChapterAt,
  shouldShowOpeningTheory,
} from "../utils/openingContext";
import { useOpeningEco } from "../hooks/useOpeningEco";
import { evaluateFen, isNativeEngineActive } from "../engine/evaluationService";
import { shouldSuggestBestMove } from "../utils/bestMoveSuggestion";
import { buildMoveFactSheet } from "../utils/moveFactSheet";
import { MoveFactSheetPanel } from "./MoveFactSheetPanel";
import { InlineErrorNotice } from "./InlineErrorNotice";
import { trackAppError } from "../utils/appError";
import { hapticSelection } from "../utils/chessSounds";
import {
  formatTablebaseSummary,
  isTablebasePosition,
  probeTablebase,
  type TablebaseResult,
} from "../utils/tablebase";

export interface MoveReviewPanelProps {
  move: AnalyzedMove | null;
  moveIdx: number;
  moves?: AnalyzedMove[];
  runId?: string;
  onContinuationFen?: (fen: string | null) => void;
  onContinuationEval?: (eval_: EvalResult | null) => void;
  onContinuationActive?: (active: boolean) => void;
  onContinuationArrow?: (arrow: { from: string; to: string } | null) => void;
  embedded?: boolean;
  onRegisterContinuationNav?: (nav: import("../utils/continuationNav").ContinuationNavHandlers | null) => void;
}

// ── Continuation step-through ────────────────────────────────────────────────
interface ContinuationViewerProps {
  firstMove: string;
  line: string[];
  startFen: string;
  actualMoveSan?: string;
  evalBefore?: EvalResult | null;
  accentColor?: string;
  label?: string;
  onFenChange?: (fen: string | null) => void;
  onEvalChange?: (eval_: EvalResult | null) => void;
  onActiveChange?: (active: boolean) => void;
  onArrowChange?: (arrow: { from: string; to: string } | null) => void;
  onRegisterNav?: (nav: import("../utils/continuationNav").ContinuationNavHandlers | null) => void;
}

// Pre-compute UCIs from SANs given a starting FEN
function computeUcis(startFen: string, sans: string[]): string[] {
  const ucis: string[] = [];
  try {
    const chess = new Chess(startFen);
    for (const san of sans) {
      const result = chess.move(san);
      if (!result) break;
      ucis.push(result.from + result.to);
    }
  } catch { /* ignore */ }
  return ucis;
}

const ContinuationViewer: React.FC<ContinuationViewerProps> = ({
  firstMove, line, startFen, actualMoveSan, evalBefore, accentColor = "#6daa6d", label = "Best continuation",
  onFenChange, onEvalChange, onActiveChange, onArrowChange, onRegisterNav,
}) => {
  const allMoves = [firstMove, ...line];
  const [step, setStep] = useState(0);
  const [evalWarning, setEvalWarning] = useState<string | null>(null);
  const hasBeenInLineRef = useRef(false);
  const evalCache = useRef<Map<string, EvalResult>>(new Map());
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFenChangeRef = useRef(onFenChange);
  const onEvalChangeRef = useRef(onEvalChange);
  const onArrowChangeRef = useRef(onArrowChange);
  const onActiveChangeRef = useRef(onActiveChange);
  const continuationActiveRef = useRef(false);
  onFenChangeRef.current = onFenChange;
  onEvalChangeRef.current = onEvalChange;
  onArrowChangeRef.current = onArrowChange;
  onActiveChangeRef.current = onActiveChange;

  const onRegisterNavRef = useRef(onRegisterNav);
  onRegisterNavRef.current = onRegisterNav;

  const setContinuationActive = (active: boolean) => {
    if (continuationActiveRef.current === active) return;
    continuationActiveRef.current = active;
    onActiveChangeRef.current?.(active);
  };

  // Pre-compute FEN after each move in the continuation
  const stepFens = useMemo(() => {
    const fens: string[] = [];
    try {
      const chess = new Chess(startFen);
      for (const san of allMoves) {
        const result = chess.move(san);
        if (!result) break;
        fens.push(chess.fen());
      }
    } catch { /* ignore */ }
    return fens;
  }, [startFen, firstMove, line.join(",")]);

  // Pre-compute UCIs for arrow/highlight animation
  const stepUcis = useMemo(() => computeUcis(startFen, allMoves), [startFen, firstMove, line.join(",")]);

  // step 0 before entering line = game position after the move; after exiting line = branch (fenBefore)
  useEffect(() => {
    if (step > 0) {
      hasBeenInLineRef.current = true;
      const fen = stepFens[step - 1];
      if (!fen) return;
      onFenChangeRef.current?.(fen);
      const uci = stepUcis[step - 1];
      if (uci) {
        onArrowChangeRef.current?.({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
      }
      const cached = evalCache.current.get(fen);
      if (cached) {
        setEvalWarning(null);
        onEvalChangeRef.current?.(cached);
      } else {
        evaluateFen(fen, isNativeEngineActive() ? 10 : 12).then((ev) => {
          evalCache.current.set(fen, ev);
          setEvalWarning(null);
          onEvalChangeRef.current?.(ev);
        }).catch((error) => {
          setEvalWarning("Live continuation eval unavailable.");
          trackAppError({
            code: "CONTINUATION_EVAL_FAILED",
            message: "Could not evaluate continuation position.",
            context: { step, error: error instanceof Error ? error.message : "unknown" },
          });
        });
      }
    } else if (hasBeenInLineRef.current) {
      onFenChangeRef.current?.(startFen);
      onEvalChangeRef.current?.(evalBefore ?? null);
      setEvalWarning(null);
      const firstUci = stepUcis[0];
      if (firstUci) {
        onArrowChangeRef.current?.({
          from: firstUci.slice(0, 2),
          to: firstUci.slice(2, 4),
        });
      } else {
        onArrowChangeRef.current?.(null);
      }
    } else {
      // Preview only: keep the board on the played game move so classification
      // badges / last-move highlights stay visible for inaccuracy/mistake/blunder.
      onFenChangeRef.current?.(null);
      onEvalChangeRef.current?.(null);
      setEvalWarning(null);
      const firstUci = stepUcis[0];
      if (firstUci) {
        onArrowChangeRef.current?.({
          from: firstUci.slice(0, 2),
          to: firstUci.slice(2, 4),
        });
      } else {
        onArrowChangeRef.current?.(null);
      }
    }
    // Active only once the user steps into the line (or returns to its root
    // after exploring). Mounting the viewer must NOT hide move badges.
    setContinuationActive(step > 0 || hasBeenInLineRef.current);
  }, [step, stepFens, stepUcis, startFen, evalBefore, firstMove, line.join(",")]);

  // Reset when the line changes
  useEffect(() => {
    setStep(0);
    hasBeenInLineRef.current = false;
    evalCache.current.clear();
    setContinuationActive(false);
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      setContinuationActive(false);
      onFenChangeRef.current?.(null);
      onEvalChangeRef.current?.(null);
      onArrowChangeRef.current?.(null);
    };
  }, [firstMove, line.join(",")])  // eslint-disable-line react-hooks/exhaustive-deps

  const goToStep = (nextStep: number) => {
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    if (nextStep <= 0) {
      if (step !== 0) hapticSelection();
      setStep(0);
      return;
    }
    if (nextStep > allMoves.length) return;
    if (nextStep === step) return;
    hapticSelection();
    setStep(nextStep);
  };

  useEffect(() => {
    const register = onRegisterNavRef.current;
    if (!register) return;
    register({
      stepForward: () => goToStep(Math.min(allMoves.length, step + 1)),
      stepBack: () => goToStep(Math.max(0, step - 1)),
      canStepForward: step < allMoves.length,
      canStepBack: step > 0,
    });
    return () => register(null);
  }, [step, allMoves.length, firstMove, line.join(",")]);

  return (
    <div className="border border-chess-border rounded-lg bg-chess-panel flex flex-col gap-2 overflow-hidden min-w-0">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2.5 pt-2 text-xs font-semibold uppercase tracking-wider text-chess-muted">
        <span>🔍</span>
        <span>{label}</span>
        <span className="ml-auto font-mono text-chess-muted/60">{step}/{allMoves.length}</span>
      </div>

      {/* Move display row */}
      <div className="flex items-center gap-1.5 px-2.5 flex-wrap">
        {allMoves.map((m, i) => (
          <button
            key={i}
            onClick={() => { goToStep(i + 1); }}
            className="font-mono text-sm font-bold px-2 py-0.5 rounded transition-all"
            style={
              i === step - 1
                ? { backgroundColor: `${accentColor}33`, color: accentColor, boxShadow: `0 0 0 1px ${accentColor}66` }
                : i < step - 1
                  ? { color: "#666", textDecoration: "line-through" }
                  : { color: "#888" }
            }
          >
            {m}
          </button>
        ))}
      </div>

      {/* Commentary for current step */}
      <div
        className="mx-2.5 mb-2 px-2 py-1.5 rounded text-xs text-chess-muted leading-relaxed"
        style={{ background: `${accentColor}0d` }}
      >
        {step === 0 && !hasBeenInLineRef.current
          ? <>Step through the engine line with Prev / Next.</>
          : step === 0
            ? <>Back at the branch.{actualMoveSan ? <> You played <span className="font-bold text-chess-text">{actualMoveSan}</span>.</> : null}</>
            : <>After <span className="font-bold" style={{ color: accentColor }}>{allMoves[step - 1]}</span>, {
              step % 2 === 1
                ? " continuing the best line."
                : " this is the engine's response."
            }</>
        }
      </div>
      {evalWarning && (
        <div className="mx-2.5 mb-2">
          <InlineErrorNotice
            message={evalWarning}
            onDismiss={() => setEvalWarning(null)}
          />
        </div>
      )}

      {/* Prev / Next controls */}
      <div className="flex border-t border-chess-border">
        <button
          onClick={() => goToStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="flex-1 py-1.5 text-xs font-semibold text-chess-muted disabled:opacity-30 hover:text-chess-text transition-colors border-r border-chess-border"
        >
          ← Prev
        </button>
        <button
          onClick={() => goToStep(Math.min(allMoves.length, step + 1))}
          disabled={step === allMoves.length}
          className="flex-1 py-1.5 text-xs font-semibold disabled:opacity-30 transition-colors hover:brightness-125"
          style={{ color: accentColor }}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

// ── Main panel ────────────────────────────────────────────────────────────────

export const MoveReviewPanel: React.FC<MoveReviewPanelProps> = ({
  move,
  moveIdx,
  moves,
  runId: _runId,
  onContinuationFen,
  onContinuationEval,
  onContinuationActive,
  onContinuationArrow,
  embedded = false,
  onRegisterContinuationNav,
}) => {
  const ecoEntries = useOpeningEco();

  const chapter = useMemo(
    () =>
      moves?.length
        ? computeOpeningChapterAt(moves, moveIdx, ecoEntries)
        : null,
    [moves, moveIdx, ecoEntries]
  );

  const leftBookLabel = useMemo(() => {
    if (chapter?.leftBookIdx == null || !moves) return undefined;
    const m = moves[chapter.leftBookIdx];
    if (!m) return undefined;
    return m.color === "w"
      ? `${m.moveNumber}. ${m.san}`
      : `${m.moveNumber}...${m.san}`;
  }, [chapter, moves]);

  const factSheet = useMemo(() => {
    if (!move?.classification) return null;
    const hint = openingHintForMove(moveIdx, moves, ecoEntries);
    return buildMoveFactSheet(move, {
      openingHint: hint,
      moveIdx,
      moves,
      ecoEntries,
    });
  }, [move, moveIdx, moves, ecoEntries]);

  const [tablebase, setTablebase] = useState<TablebaseResult | null>(null);

  useEffect(() => {
    if (!move?.fenAfter || !isTablebasePosition(move.fenAfter)) {
      setTablebase(null);
      return;
    }
    const ac = new AbortController();
    let cancelled = false;
    probeTablebase(move.fenAfter, ac.signal)
      .then((tb) => {
        if (!cancelled) setTablebase(tb);
      })
      .catch(() => {
        if (!cancelled) setTablebase(null);
      });
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [move?.fenAfter]);

  if (!move) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-chess-muted text-xs gap-2 p-6 text-center">
        <CoachIcon color="#6daa6d" size={36} />
        <p>Select a move to see coach notes, eval, and engine lines.</p>
      </div>
    );
  }

  const meta = move.classification ? getMeta(move.classification) : null;
  const accent = meta?.color ?? "#6daa6d";

  const isNegative = ["inaccuracy", "mistake", "miss", "blunder"].includes(
    move.classification ?? ""
  );

  const suggestBest = shouldSuggestBestMove(move);
  const showContinuation = suggestBest && !!move.bestMoveSan;
  const showOpeningChapter =
    !!moves?.length && shouldShowOpeningTheory(moveIdx, moves, ecoEntries);

  return (
    <div
      className={`flex flex-col text-sm flex-1 min-w-0 overflow-x-hidden ${
        embedded ? "gap-2.5 px-3 py-2.5" : "gap-3 p-3 sm:p-3"
      }`}
    >
      {showOpeningChapter && (
          <OpeningChapter
            chapter={chapter}
            currentMoveIndex={moveIdx}
            leftBookLabel={leftBookLabel}
          />
        )}

      {/* Move + classification */}
      <div className="flex items-start gap-2">
        <div
          className="flex-shrink-0 rounded-full p-0.5 mt-0.5"
          style={{ background: `${accent}14` }}
        >
          <CoachIcon color={accent} size={26} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-chess-muted text-xs font-mono">
              {move.moveNumber}
              {move.color === "w" ? "." : "..."}
            </span>
            <span className="font-bold text-chess-text font-mono text-base">
              {move.san}
            </span>
            {meta && (
              <span
                className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{ backgroundColor: `${accent}22`, color: accent }}
              >
                <ClassificationIcon type={move.classification!} size="sm" />
                {meta.label}
              </span>
            )}
            {!move.verified && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                Unverified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Move summary */}
      {factSheet && (
        <MoveFactSheetPanel
          sheet={factSheet}
          embedded={embedded}
          hideOpening={showOpeningChapter}
        />
      )}

      {tablebase && (
        <div
          className={`text-xs ${
            embedded
              ? "border-l-2 border-chess-accent/40 pl-2.5 py-0.5"
              : "rounded-md border border-chess-border/50 p-2.5"
          }`}
        >
          <dl className="grid grid-cols-[minmax(5.5rem,auto)_1fr] gap-x-3 gap-y-2">
            <dt className="text-chess-muted font-medium pt-px">Tablebase</dt>
            <dd className="text-chess-text">{formatTablebaseSummary(tablebase)}</dd>
            {tablebase.best?.san && (
              <>
                <dt className="text-chess-muted font-medium pt-px">TB best</dt>
                <dd className="text-chess-text font-mono">{tablebase.best.san}</dd>
              </>
            )}
          </dl>
        </div>
      )}

      {/* Interactive continuation */}
      {showContinuation && move.bestMoveSan && (
        <ContinuationViewer
          key={`${moveIdx}-${move.bestMoveSan}`}
          firstMove={move.bestMoveSan}
          line={move.pvLine ?? []}
          startFen={move.fenBefore}
          actualMoveSan={move.san}
          evalBefore={move.evalBefore}
          accentColor={isNegative ? "#6daa6d" : meta?.color ?? "#6daa6d"}
          label={
            isNegative ? "Better line from here" : "Engine's top line from here"
          }
          onFenChange={onContinuationFen}
          onEvalChange={onContinuationEval}
          onActiveChange={onContinuationActive}
          onArrowChange={onContinuationArrow}
          onRegisterNav={onRegisterContinuationNav}
        />
      )}
    </div>
  );
};

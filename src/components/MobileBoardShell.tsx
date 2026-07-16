import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalysisState, EvalResult } from "../types";
import type { GameEndInfo } from "../utils/gameEnd";
import { useHoldToRepeat } from "../hooks/useHoldToRepeat";
import { MOBILE_LAYOUT } from "../utils/boardLayout";
import { prepareChessAudio } from "../utils/chessSounds";
import { AnalyzeBoardStack } from "./AnalyzeBoardStack";
import type { BoardReviewConflict } from "./BoardAnalyzeOverlay";
import { EvalBar } from "./EvalBar";
import type { ReviewChessboardProps } from "./ReviewChessboard";

interface MobileBoardShellProps extends ReviewChessboardProps {
  evalResult: EvalResult | null;
  onPrev?: (animate?: boolean) => void;
  onNext?: (animate?: boolean) => void;
  canPrev?: boolean;
  canNext?: boolean;
  analysisState?: AnalysisState;
  showAnalyzeButton?: boolean;
  showGameEnd?: boolean;
  gameEnd?: GameEndInfo | null;
  whiteName?: string;
  blackName?: string;
  onAnalyze?: () => void;
  onCancelAnalysis?: () => void;
  progressPercent?: number;
  analysisStageLabel?: string;
  analyzingMoveSan?: string;
  analysisEtaLabel?: string | null;
  showProgressOrb?: boolean;
  analyzingPly?: number;
  analyzingTotalPlies?: number;
  reviewConflict?: BoardReviewConflict | null;
}

function MoveTapZone({
  side,
  enabled,
  emphasize,
  onTap,
  onHoldStep,
  onInteract,
}: {
  side: "prev" | "next";
  enabled: boolean;
  emphasize: boolean;
  onTap: () => void;
  onHoldStep: () => void;
  onInteract: () => void;
}) {
  const tap = () => {
    onInteract();
    void prepareChessAudio().then(onTap);
  };
  const holdStep = () => {
    onInteract();
    onHoldStep();
  };
  const handlers = useHoldToRepeat(tap, holdStep, enabled);
  const isPrev = side === "prev";

  return (
    <>
      {(enabled || emphasize) && (
        <div
          data-side={isPrev ? "prev" : "next"}
          className={`absolute top-0 bottom-0 w-[34%] z-10 pointer-events-none mobile-tap-edge ${
            isPrev ? "left-0" : "right-0"
          } ${
            emphasize
              ? "mobile-tap-edge--hint"
              : enabled
                ? "mobile-tap-edge--idle"
                : "mobile-tap-edge--disabled"
          }`}
          aria-hidden
        />
      )}
      {(enabled || emphasize) && (
        <span
          className={`absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none flex h-10 w-10 items-center justify-center rounded-full border transition-opacity duration-500 ${
            isPrev ? "left-2" : "right-2"
          } ${
            emphasize
              ? "border-white/30 bg-black/55 text-white mobile-tap-chevron--hint"
              : enabled
                ? "border-white/10 bg-black/25 text-white/45 opacity-70"
                : "border-white/8 bg-black/20 text-white/30 opacity-50"
          }`}
          aria-hidden
        >
          <span className="text-xl font-semibold leading-none">
            {isPrev ? "‹" : "›"}
          </span>
        </span>
      )}
      <button
        type="button"
        aria-label={isPrev ? "Previous move" : "Next move"}
        disabled={!enabled}
        className={`absolute top-0 bottom-0 w-[34%] z-30 touch-manipulation disabled:pointer-events-none ${
          isPrev ? "left-0" : "right-0"
        }`}
        style={{ background: "transparent", touchAction: "manipulation" }}
        {...handlers}
      />
    </>
  );
}

/** Board + slim eval bar + left/right tap zones (hold to scrub moves). */
export function MobileBoardShell({
  evalResult,
  boardWidth,
  boardOrientation,
  onPrev,
  onNext,
  canPrev = false,
  canNext = false,
  analysisState = "idle",
  showAnalyzeButton = false,
  showGameEnd = false,
  gameEnd,
  whiteName,
  blackName,
  onAnalyze,
  onCancelAnalysis,
  progressPercent = 0,
  analysisStageLabel,
  analyzingMoveSan,
  analysisEtaLabel,
  showProgressOrb = false,
  analyzingPly,
  analyzingTotalPlies,
  reviewConflict = null,
  ...boardProps
}: MobileBoardShellProps) {
  const barWidth = MOBILE_LAYOUT.evalBar;
  const frameWidth = boardWidth + barWidth;
  const canNavigate = !!(onPrev && onNext && (canPrev || canNext));

  const [showTapHint, setShowTapHint] = useState(false);
  const wasNavigableRef = useRef(false);

  // Show a clear edge-tap hint each time a review becomes navigable (e.g. after analysis).
  useEffect(() => {
    if (canNavigate && !wasNavigableRef.current) {
      setShowTapHint(true);
    }
    if (!canNavigate) {
      setShowTapHint(false);
    }
    wasNavigableRef.current = canNavigate;
  }, [canNavigate]);

  useEffect(() => {
    if (!showTapHint || !canNavigate) return;
    const t = window.setTimeout(() => setShowTapHint(false), 10000);
    return () => window.clearTimeout(t);
  }, [showTapHint, canNavigate]);

  const dismissTapHint = useCallback(() => {
    setShowTapHint(false);
  }, []);

  const emphasizeZones = showTapHint && canNavigate;
  const hintCopy = !canPrev && canNext
    ? "Tap the right edge › to play the next move"
    : "Tap the left / right edges to browse moves";

  return (
    <div className="relative w-full flex justify-center mobile-board-shell">
      <div
        className="game-board-frame"
        style={{
          width: frameWidth,
          height: boardWidth,
        }}
      >
        <div
          className="flex items-stretch min-w-0 overflow-visible"
          style={{ height: boardWidth }}
        >
          <EvalBar
            evalResult={evalResult}
            boardFlipped={boardOrientation === "black"}
            barHeight={boardWidth}
            integrated
            integratedWidth={barWidth}
          />
          <div
            className={`relative flex-1 min-w-0 h-full ${
              boardProps.engineLineGlow ?? boardProps.continuationActive
                ? "overflow-visible"
                : "overflow-hidden"
            }`}
          >
            <AnalyzeBoardStack
              {...boardProps}
              boardWidth={boardWidth}
              boardOrientation={boardOrientation}
              analysisState={analysisState}
              showAnalyzeButton={showAnalyzeButton}
              showGameEnd={showGameEnd}
              gameEnd={gameEnd}
              whiteName={whiteName}
              blackName={blackName}
              onAnalyze={onAnalyze}
              onCancelAnalysis={onCancelAnalysis}
              progressPercent={progressPercent}
              analysisStageLabel={analysisStageLabel}
              analyzingMoveSan={analyzingMoveSan}
              analysisEtaLabel={analysisEtaLabel}
              showProgressOrb={showProgressOrb}
              analyzingPly={analyzingPly}
              analyzingTotalPlies={analyzingTotalPlies}
              reviewConflict={reviewConflict}
            />

            {emphasizeZones && (
              <div
                className="absolute inset-x-0 bottom-2.5 z-40 flex justify-center pointer-events-none px-3"
                role="status"
                aria-live="polite"
              >
                <p className="mobile-tap-hint-pill text-[11px] font-semibold text-white tracking-wide">
                  {hintCopy}
                </p>
              </div>
            )}

            {onPrev && (
              <MoveTapZone
                side="prev"
                enabled={canPrev}
                emphasize={emphasizeZones}
                onTap={() => onPrev(true)}
                onHoldStep={() => onPrev(false)}
                onInteract={dismissTapHint}
              />
            )}
            {onNext && (
              <MoveTapZone
                side="next"
                enabled={canNext}
                emphasize={emphasizeZones}
                onTap={() => onNext(true)}
                onHoldStep={() => onNext(false)}
                onInteract={dismissTapHint}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

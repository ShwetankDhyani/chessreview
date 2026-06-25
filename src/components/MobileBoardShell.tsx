import { useCallback, useEffect, useState } from "react";
import type { AnalysisState, EvalResult } from "../types";
import type { GameEndInfo } from "../utils/gameEnd";
import { useHoldToRepeat } from "../hooks/useHoldToRepeat";
import { prepareChessAudio } from "../utils/chessSounds";
import { AnalyzeBoardStack } from "./AnalyzeBoardStack";
import { EvalBar } from "./EvalBar";
import type { ReviewChessboardProps } from "./ReviewChessboard";

const MOVE_TAP_HINT_KEY = "cr_mobile_move_tap_seen";

interface MobileBoardShellProps extends ReviewChessboardProps {
  evalResult: EvalResult | null;
  onPrev: (animate?: boolean) => void;
  onNext: (animate?: boolean) => void;
  canPrev: boolean;
  canNext: boolean;
  analysisState?: AnalysisState;
  showAnalyzeButton?: boolean;
  showGameEnd?: boolean;
  gameEnd?: GameEndInfo | null;
  whiteName?: string;
  blackName?: string;
  onAnalyze?: () => void;
  showEngineLineBanner?: boolean;
  progressPercent?: number;
  analysisStageLabel?: string;
  analyzingMoveSan?: string;
  analysisEtaLabel?: string | null;
  showProgressOrb?: boolean;
  analyzingPly?: number;
  analyzingTotalPlies?: number;
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
      {enabled && (
        <div
          data-side={isPrev ? "prev" : "next"}
          className={`absolute top-0 bottom-0 w-[34%] z-10 pointer-events-none mobile-tap-edge ${
            isPrev ? "left-0" : "right-0"
          } ${emphasize ? "mobile-tap-edge--hint" : "mobile-tap-edge--idle"}`}
          aria-hidden
        />
      )}
      {enabled && (
        <span
          className={`absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none flex h-9 w-9 items-center justify-center rounded-full border transition-opacity duration-500 ${
            isPrev ? "left-2" : "right-2"
          } ${
            emphasize
              ? "border-white/25 bg-black/45 text-white/85 mobile-tap-chevron--hint"
              : "border-white/10 bg-black/25 text-white/45 opacity-70"
          }`}
          aria-hidden
        >
          <span className="text-lg font-semibold leading-none">
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

/** Board + slim eval bar + left/right tap zones (hold to scrub moves) */
export function MobileBoardShell({
  evalResult,
  boardWidth,
  boardOrientation,
  onPrev,
  onNext,
  canPrev,
  canNext,
  analysisState = "idle",
  showAnalyzeButton = false,
  showGameEnd = false,
  gameEnd,
  whiteName,
  blackName,
  onAnalyze,
  showEngineLineBanner = false,
  progressPercent = 0,
  analysisStageLabel,
  analyzingMoveSan,
  analysisEtaLabel,
  showProgressOrb = false,
  analyzingPly,
  analyzingTotalPlies,
  ...boardProps
}: MobileBoardShellProps) {
  const barWidth = 14;
  const frameWidth = boardWidth + barWidth;
  const canNavigate = canPrev || canNext;

  const [showTapHint, setShowTapHint] = useState(false);

  useEffect(() => {
    if (!canNavigate) {
      setShowTapHint(false);
      return;
    }
    try {
      setShowTapHint(localStorage.getItem(MOVE_TAP_HINT_KEY) !== "1");
    } catch {
      setShowTapHint(true);
    }
  }, [canNavigate]);

  useEffect(() => {
    if (!showTapHint || !canNavigate) return;
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(MOVE_TAP_HINT_KEY, "1");
      } catch {
        /* ignore */
      }
      setShowTapHint(false);
    }, 6000);
    return () => window.clearTimeout(t);
  }, [showTapHint, canNavigate]);

  const dismissTapHint = useCallback(() => {
    if (!showTapHint) return;
    try {
      localStorage.setItem(MOVE_TAP_HINT_KEY, "1");
    } catch {
      /* ignore */
    }
    setShowTapHint(false);
  }, [showTapHint]);

  const emphasizeZones = showTapHint && canNavigate;

  return (
    <div className="relative w-full flex justify-center">
      <div
        className={`game-board-frame${showEngineLineBanner ? " game-board-frame--tagged" : ""}`}
        style={{
          width: frameWidth,
          height: showEngineLineBanner ? undefined : boardWidth,
        }}
      >
        {showEngineLineBanner ? (
          <div className="engine-line-tag-row" aria-live="polite">
            <span className="engine-line-tag">Engine line</span>
          </div>
        ) : null}
        <div
          className="flex items-stretch min-w-0"
          style={{ height: boardWidth }}
        >
          <EvalBar
            evalResult={evalResult}
            boardFlipped={boardOrientation === "black"}
            barHeight={boardWidth}
            integrated
          />
          <div className="relative flex-1 min-w-0 h-full overflow-visible">
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
              showEngineLineBanner={false}
              progressPercent={progressPercent}
              analysisStageLabel={analysisStageLabel}
              analyzingMoveSan={analyzingMoveSan}
              analysisEtaLabel={analysisEtaLabel}
              showProgressOrb={showProgressOrb}
              analyzingPly={analyzingPly}
              analyzingTotalPlies={analyzingTotalPlies}
            />

            {emphasizeZones && (
              <div
                className="absolute inset-x-0 bottom-2.5 z-40 flex justify-center pointer-events-none px-3"
                role="status"
                aria-live="polite"
              >
                <p className="mobile-tap-hint-pill text-[10px] font-medium text-white/90 tracking-wide">
                  Tap board edges to browse moves
                </p>
              </div>
            )}

            <MoveTapZone
              side="prev"
              enabled={canPrev}
              emphasize={emphasizeZones && canPrev}
              onTap={() => onPrev(true)}
              onHoldStep={() => onPrev(false)}
              onInteract={dismissTapHint}
            />
            <MoveTapZone
              side="next"
              enabled={canNext}
              emphasize={emphasizeZones && canNext}
              onTap={() => onNext(true)}
              onHoldStep={() => onNext(false)}
              onInteract={dismissTapHint}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

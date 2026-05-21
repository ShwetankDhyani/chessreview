import type { AnalysisState, EvalResult } from "../types";
import type { GameEndInfo } from "../utils/gameEnd";
import { useHoldToRepeat } from "../hooks/useHoldToRepeat";
import { prepareChessAudio } from "../utils/chessSounds";
import { AnalyzeBoardStack } from "./AnalyzeBoardStack";
import { EvalBar } from "./EvalBar";
import type { ReviewChessboardProps } from "./ReviewChessboard";

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
  positionFen: string;
  whiteName?: string;
  blackName?: string;
  onAnalyze?: () => void;
}

function MoveTapZone({
  side,
  enabled,
  onTap,
  onHoldStep,
}: {
  side: "prev" | "next";
  enabled: boolean;
  onTap: () => void;
  onHoldStep: () => void;
}) {
  const tap = () => {
    void prepareChessAudio().then(onTap);
  };
  const holdStep = () => {
    onHoldStep();
  };
  const handlers = useHoldToRepeat(tap, holdStep, enabled);
  const isPrev = side === "prev";

  return (
    <>
      {enabled && (
        <span
          className={`absolute ${isPrev ? "left-1" : "right-1"} top-1/2 -translate-y-1/2 z-20 pointer-events-none text-white/35 text-3xl font-bold leading-none select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]`}
          aria-hidden
        >
          {isPrev ? "‹" : "›"}
        </span>
      )}
      <button
        type="button"
        aria-label={isPrev ? "Previous move" : "Next move"}
        disabled={!enabled}
        className={`absolute ${isPrev ? "left-0" : "right-0"} top-0 bottom-0 w-[32%] z-30 touch-manipulation disabled:pointer-events-none`}
        style={{ background: "transparent" }}
        {...handlers}
      />
    </>
  );
}

/** Board + slim eval bar + visible left/right tap zones (hold to scrub moves) */
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
  positionFen,
  whiteName,
  blackName,
  onAnalyze,
  ...boardProps
}: MobileBoardShellProps) {
  const barHeight = boardWidth;

  return (
    <div className="relative w-full flex justify-center">
      <div
        className="flex items-stretch gap-1.5"
        style={{ maxWidth: boardWidth + 28 }}
      >
        <EvalBar
          evalResult={evalResult}
          boardFlipped={boardOrientation === "black"}
          barHeight={barHeight}
          compact
        />
        <div
          className="relative flex-shrink-0 overflow-visible"
          style={{ width: boardWidth, height: boardWidth }}
        >
          <AnalyzeBoardStack
            {...boardProps}
            boardWidth={boardWidth}
            boardOrientation={boardOrientation}
            positionFen={positionFen}
            analysisState={analysisState}
            showAnalyzeButton={showAnalyzeButton}
            showGameEnd={showGameEnd}
            gameEnd={gameEnd}
            whiteName={whiteName}
            blackName={blackName}
            onAnalyze={onAnalyze}
          />
          <MoveTapZone
            side="prev"
            enabled={canPrev}
            onTap={() => onPrev(true)}
            onHoldStep={() => onPrev(false)}
          />
          <MoveTapZone
            side="next"
            enabled={canNext}
            onTap={() => onNext(true)}
            onHoldStep={() => onNext(false)}
          />
        </div>
      </div>
    </div>
  );
}

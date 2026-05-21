import type { AnalysisState, EvalResult } from "../types";
import type { GameEndInfo } from "../utils/gameEnd";
import { useHoldToRepeat } from "../hooks/useHoldToRepeat";
import { prepareChessAudio } from "../utils/chessSounds";
import { AnalyzeBoardStack } from "./AnalyzeBoardStack";
import { EvalBar } from "./EvalBar";
import type { ReviewChessboardProps } from "./ReviewChessboard";

interface MobileBoardShellProps extends ReviewChessboardProps {
  evalResult: EvalResult | null;
  moveIndex: number;
  moveCount: number;
  onPrev: () => void;
  onNext: () => void;
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
  onStep,
}: {
  side: "prev" | "next";
  enabled: boolean;
  onStep: () => void;
}) {
  const step = () => {
    void prepareChessAudio().then(onStep);
  };
  const handlers = useHoldToRepeat(step, enabled);
  const isPrev = side === "prev";

  return (
    <>
      {enabled && (
        <div
          className={`absolute ${isPrev ? "left-0" : "right-0"} top-0 bottom-0 w-[32%] z-20 pointer-events-none ${
            isPrev
              ? "bg-gradient-to-r from-black/55 via-black/25 to-transparent"
              : "bg-gradient-to-l from-black/55 via-black/25 to-transparent"
          }`}
          aria-hidden
        />
      )}
      {enabled && (
        <div
          className={`absolute ${isPrev ? "left-2" : "right-2"} top-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center justify-center w-10 h-[4.5rem] rounded-lg bg-black/60 border border-white/15 shadow-lg`}
          aria-hidden
        >
          <span className="text-white/90 text-3xl font-bold leading-none select-none">
            {isPrev ? "‹" : "›"}
          </span>
        </div>
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
  moveIndex,
  moveCount,
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
    <div className="relative w-full flex justify-center pb-4">
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
          <MoveTapZone side="prev" enabled={canPrev} onStep={onPrev} />
          <MoveTapZone side="next" enabled={canNext} onStep={onNext} />
        </div>
      </div>
      {moveCount > 0 && (
        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[10px] text-chess-muted font-mono tabular-nums pointer-events-none">
          {moveIndex < 0
            ? `Start · ${moveCount} plies`
            : `Ply ${moveIndex + 1} / ${moveCount}`}
        </div>
      )}
    </div>
  );
}

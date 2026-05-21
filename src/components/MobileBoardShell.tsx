import type { AnalysisState, EvalResult } from "../types";
import type { GameEndInfo } from "../utils/gameEnd";
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

/** Board + slim eval bar + left/right tap zones for move navigation */
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
          className="relative flex-shrink-0"
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
          <button
            type="button"
            aria-label="Previous move"
            disabled={!canPrev}
            onClick={(e) => {
              e.stopPropagation();
              void prepareChessAudio().then(() => {
                if (canPrev) onPrev();
              });
            }}
            className="absolute left-0 top-0 bottom-0 w-[30%] z-30 touch-manipulation disabled:pointer-events-none"
            style={{ background: "transparent" }}
          />
          <button
            type="button"
            aria-label="Next move"
            disabled={!canNext}
            onClick={(e) => {
              e.stopPropagation();
              void prepareChessAudio().then(() => {
                if (canNext) onNext();
              });
            }}
            className="absolute right-0 top-0 bottom-0 w-[30%] z-30 touch-manipulation disabled:pointer-events-none"
            style={{ background: "transparent" }}
          />
          {canPrev && (
            <div
              className="absolute left-1 top-1/2 -translate-y-1/2 z-20 pointer-events-none text-white/25 text-2xl font-bold select-none"
              aria-hidden
            >
              ‹
            </div>
          )}
          {canNext && (
            <div
              className="absolute right-1 top-1/2 -translate-y-1/2 z-20 pointer-events-none text-white/25 text-2xl font-bold select-none"
              aria-hidden
            >
              ›
            </div>
          )}
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

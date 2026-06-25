import type { AnalysisState } from "../types";
import type { GameEndInfo } from "../utils/gameEnd";
import { BoardAnalyzeOverlay } from "./BoardAnalyzeOverlay";
import { BoardGameEndOverlay } from "./BoardGameEndOverlay";
import { ReviewChessboard, type ReviewChessboardProps } from "./ReviewChessboard";

interface AnalyzeBoardStackProps extends ReviewChessboardProps {
  analysisState: AnalysisState;
  showAnalyzeButton: boolean;
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

/** Chessboard + centered analyze / progress overlay */
export function AnalyzeBoardStack({
  analysisState,
  showAnalyzeButton,
  showGameEnd = false,
  gameEnd,
  whiteName = "White",
  blackName = "Black",
  onAnalyze,
  showEngineLineBanner = false,
  progressPercent = 0,
  analysisStageLabel,
  analyzingMoveSan,
  analysisEtaLabel,
  showProgressOrb = false,
  analyzingPly,
  analyzingTotalPlies,
  boardWidth,
  boardOrientation,
  ...boardProps
}: AnalyzeBoardStackProps) {
  return (
    <div
      className="relative flex-shrink-0 overflow-visible"
      style={{ width: boardWidth, height: boardWidth + 2 }}
    >
      <ReviewChessboard
        boardWidth={boardWidth}
        boardOrientation={boardOrientation}
        {...boardProps}
      />
      {showEngineLineBanner ? (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-2.5 py-1 rounded-full bg-black/80 border border-white/15 text-[10px] text-white/90 pointer-events-none whitespace-nowrap shadow-md">
          Engine line — close continuation to return to the game
        </div>
      ) : null}
      {showGameEnd && gameEnd ? (
        <BoardGameEndOverlay
          end={gameEnd}
          whiteName={whiteName}
          blackName={blackName}
        />
      ) : null}
      {showAnalyzeButton ? (
        <BoardAnalyzeOverlay
          state={analysisState}
          onAnalyze={onAnalyze}
          progressPercent={progressPercent}
          stageLabel={analysisStageLabel}
          currentSan={analyzingMoveSan}
          etaLabel={analysisEtaLabel}
          showProgressOrb={showProgressOrb}
          currentPly={analyzingPly}
          totalPlies={analyzingTotalPlies}
        />
      ) : null}
    </div>
  );
}

import type { AnalysisState } from "../types";
import type { GameEndInfo } from "../utils/gameEnd";
import {
  BoardAnalyzeOverlay,
  type BoardReviewConflict,
} from "./BoardAnalyzeOverlay";
import { BoardGameEndOverlay } from "./BoardGameEndOverlay";
import { ReviewChessboard, type ReviewChessboardProps } from "./ReviewChessboard";

interface AnalyzeBoardStackProps extends ReviewChessboardProps {
  analysisState: AnalysisState;
  showAnalyzeButton: boolean;
  onCancelAnalysis?: () => void;
  showGameEnd?: boolean;
  gameEnd?: GameEndInfo | null;
  whiteName?: string;
  blackName?: string;
  onAnalyze?: () => void;
  progressPercent?: number;
  analysisStageLabel?: string;
  analyzingMoveSan?: string;
  analysisEtaLabel?: string | null;
  analyzingPly?: number;
  analyzingTotalPlies?: number;
  reviewConflict?: BoardReviewConflict | null;
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
  onCancelAnalysis,
  progressPercent = 0,
  analysisStageLabel,
  analyzingMoveSan,
  analysisEtaLabel,
  analyzingPly,
  analyzingTotalPlies,
  reviewConflict = null,
  boardWidth,
  boardOrientation,
  ...boardProps
}: AnalyzeBoardStackProps) {
  return (
    <div
      className="flex flex-col flex-shrink-0 overflow-visible"
      style={{ width: boardWidth }}
    >
      <div
        className="relative flex-shrink-0 overflow-visible"
        style={{ width: boardWidth, height: boardWidth + 2 }}
      >
        <ReviewChessboard
          boardWidth={boardWidth}
          boardOrientation={boardOrientation}
          {...boardProps}
        />
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
            currentPly={analyzingPly}
            totalPlies={analyzingTotalPlies}
            onCancel={onCancelAnalysis}
            conflict={reviewConflict}
          />
        ) : null}
      </div>
    </div>
  );
}

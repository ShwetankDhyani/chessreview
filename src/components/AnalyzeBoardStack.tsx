import type { AnalysisState } from "../types";
import { BoardAnalyzeOverlay } from "./BoardAnalyzeOverlay";
import { ReviewChessboard, type ReviewChessboardProps } from "./ReviewChessboard";

interface AnalyzeBoardStackProps extends ReviewChessboardProps {
  analysisState: AnalysisState;
  progressPercent: number;
  showOverlay: boolean;
  playerLabel?: string;
  onAnalyze?: () => void;
}

/** Chessboard + centered analyze / progress overlay */
export function AnalyzeBoardStack({
  analysisState,
  progressPercent,
  showOverlay,
  playerLabel,
  onAnalyze,
  boardWidth,
  ...boardProps
}: AnalyzeBoardStackProps) {
  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: boardWidth, height: boardWidth }}
    >
      <ReviewChessboard boardWidth={boardWidth} {...boardProps} />
      {showOverlay ? (
        <BoardAnalyzeOverlay
          state={analysisState}
          progressPercent={progressPercent}
          playerLabel={playerLabel}
          onAnalyze={onAnalyze}
          disabled={analysisState === "analyzing"}
        />
      ) : null}
    </div>
  );
}

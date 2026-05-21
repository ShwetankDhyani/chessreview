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
  positionFen: string;
  whiteName?: string;
  blackName?: string;
  onAnalyze?: () => void;
}

/** Chessboard + centered analyze / progress overlay */
export function AnalyzeBoardStack({
  analysisState,
  showAnalyzeButton,
  showGameEnd = false,
  gameEnd,
  positionFen,
  whiteName = "White",
  blackName = "Black",
  onAnalyze,
  boardWidth,
  boardOrientation,
  ...boardProps
}: AnalyzeBoardStackProps) {
  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: boardWidth, height: boardWidth }}
    >
      <ReviewChessboard
        boardWidth={boardWidth}
        boardOrientation={boardOrientation}
        {...boardProps}
      />
      {showGameEnd && gameEnd ? (
        <BoardGameEndOverlay
          end={gameEnd}
          fen={positionFen}
          boardOrientation={boardOrientation}
          whiteName={whiteName}
          blackName={blackName}
        />
      ) : null}
      {showAnalyzeButton ? (
        <BoardAnalyzeOverlay
          state={analysisState}
          onAnalyze={onAnalyze}
        />
      ) : null}
    </div>
  );
}

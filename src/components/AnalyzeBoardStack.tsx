import type { AnalysisState } from "../types";
import type { GameEndInfo } from "../utils/gameEnd";
import { BoardAnalyzeOverlay } from "./BoardAnalyzeOverlay";
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
  onCancelAnalysis,
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
      className="flex flex-col flex-shrink-0 overflow-visible"
      style={{ width: boardWidth }}
    >
      {showEngineLineBanner ? (
        <div className="engine-line-tag-row" aria-live="polite">
          <span className="engine-line-tag">Engine line</span>
        </div>
      ) : null}
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
          showProgressOrb={showProgressOrb}
          currentPly={analyzingPly}
          totalPlies={analyzingTotalPlies}
          onCancel={onCancelAnalysis}
        />
      ) : null}
      </div>
    </div>
  );
}

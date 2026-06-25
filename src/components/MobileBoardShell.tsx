import type { AnalysisState, EvalResult } from "../types";
import type { GameEndInfo } from "../utils/gameEnd";
import { AnalyzeBoardStack } from "./AnalyzeBoardStack";
import { EvalBar } from "./EvalBar";
import type { ReviewChessboardProps } from "./ReviewChessboard";

interface MobileBoardShellProps extends ReviewChessboardProps {
  evalResult: EvalResult | null;
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

/** Board + slim eval bar — move navigation uses explicit buttons outside this shell. */
export function MobileBoardShell({
  evalResult,
  boardWidth,
  boardOrientation,
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

  return (
    <div className="relative w-full flex justify-center mobile-board-shell">
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
          </div>
        </div>
      </div>
    </div>
  );
}

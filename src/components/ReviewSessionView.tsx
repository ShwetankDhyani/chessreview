import { useEffect, useMemo, useState } from "react";
import { AnalyzeBoardStack } from "./AnalyzeBoardStack";
import { EvalBar } from "./EvalBar";
import { EvalBadge } from "./EvalBadge";
import { EvalChartPanel } from "./EvalChartPanel";
import { EngineLineNavBar } from "./EngineLineNavBar";
import { MobileBoardControls } from "./MobileBoardControls";
import { MobileBoardShell } from "./MobileBoardShell";
import { MoveReviewPanel } from "./MoveReviewPanel";
import { PlayerTag } from "./PlayerTag";
import {
  computeDesktopBoardSize,
  computeMobileBoardSize,
} from "../utils/boardLayout";
import { coachShowsBestWas } from "../utils/moveFactSheet";
import type { ReviewBoardSession } from "../hooks/useReviewBoardSession";

function useViewport() {
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 480,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
  }));
  useEffect(() => {
    const onResize = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return viewport;
}

export interface ReviewSessionViewProps {
  session: ReviewBoardSession;
  runId?: string;
  layout: "desktop" | "mobile";
}

export function ReviewSessionView({
  session,
  runId,
  layout,
}: ReviewSessionViewProps) {
  const viewport = useViewport();
  const [desktopEvalGraphOpen, setDesktopEvalGraphOpen] = useState(false);
  const [mobileEvalGraphOpen, setMobileEvalGraphOpen] = useState(false);

  const {
    moves,
    playerNames,
    gameMeta,
    currentMoveIdx,
    currentMove,
    displayEval,
    boardPositionFen,
    boardLastMoveHighlight,
    boardFlipped,
    setBoardFlipped,
    showBestMove,
    setShowBestMove,
    continuationActive,
    continuationArrow,
    engineLineGlow,
    continuationNav,
    boardPieceAnimMs,
    boardRemountKey,
    navigateToMove,
    stepBoardMove,
    handleContinuationFen,
    handleContinuationActive,
    handleContinuationEval,
    handleContinuationArrow,
    handleRegisterContinuationNav,
    gameEnd,
    showBoardGameEnd,
    canBoardStepBack,
    canBoardStepForward,
    topClock,
    bottomClock,
  } = session;

  const desktopBoardSize = computeDesktopBoardSize(viewport.w, viewport.h, {
    evalGraphOpen: desktopEvalGraphOpen,
    hasAnalyzedMoves: moves.length > 0,
  });

  const mobileBoardSize = computeMobileBoardSize(viewport.w, viewport.h, {
    evalGraphOpen: mobileEvalGraphOpen && moves.length > 0,
  });

  const showBestMoveArrow = useMemo(
    () =>
      !continuationActive &&
      !showBoardGameEnd &&
      !!showBestMove &&
      coachShowsBestWas(currentMove),
    [continuationActive, showBoardGameEnd, showBestMove, currentMove]
  );

  const coachPanel = (
    <MoveReviewPanel
      move={currentMove}
      moveIdx={currentMoveIdx}
      moves={moves}
      runId={runId}
      onContinuationFen={handleContinuationFen}
      onContinuationEval={handleContinuationEval}
      onContinuationActive={handleContinuationActive}
      onContinuationArrow={handleContinuationArrow}
      onRegisterContinuationNav={handleRegisterContinuationNav}
      embedded={layout === "mobile"}
    />
  );

  if (layout === "desktop") {
    return (
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        <div className="flex flex-1 items-center justify-center px-4 py-3 gap-4 min-h-0 overflow-hidden">
          <div className="flex items-stretch gap-2 max-h-full">
            <div className="relative flex flex-col gap-1">
              <div className="pl-[34px]">
                <PlayerTag
                  name={boardFlipped ? playerNames.white : playerNames.black}
                  color={boardFlipped ? "white" : "black"}
                  rating={
                    boardFlipped ? gameMeta?.whiteRating : gameMeta?.blackRating
                  }
                  result={gameMeta?.result ?? null}
                  isLastMove={currentMoveIdx === moves.length - 1}
                  clock={topClock}
                  side={boardFlipped ? "w" : "b"}
                />
              </div>
              <div className="flex items-stretch gap-1.5">
                <EvalBar
                  evalResult={displayEval}
                  boardFlipped={boardFlipped}
                  barHeight={desktopBoardSize}
                />
                <AnalyzeBoardStack
                  position={boardPositionFen}
                  boardWidth={desktopBoardSize}
                  boardOrientation={boardFlipped ? "black" : "white"}
                  animationDuration={boardPieceAnimMs}
                  remountKey={boardRemountKey}
                  dimmed={false}
                  continuationActive={continuationActive}
                  engineLineGlow={engineLineGlow}
                  lastMoveHighlight={boardLastMoveHighlight}
                  continuationArrow={continuationArrow}
                  showBestMoveArrow={showBestMoveArrow}
                  bestMove={currentMove?.bestMove}
                  analysisState="done"
                  showAnalyzeButton={false}
                  showGameEnd={showBoardGameEnd}
                  gameEnd={gameEnd}
                  whiteName={playerNames.white}
                  blackName={playerNames.black}
                />
              </div>
              <div className="pl-[34px]">
                <PlayerTag
                  name={boardFlipped ? playerNames.black : playerNames.white}
                  color={boardFlipped ? "black" : "white"}
                  rating={
                    boardFlipped ? gameMeta?.blackRating : gameMeta?.whiteRating
                  }
                  result={gameMeta?.result ?? null}
                  isLastMove={currentMoveIdx === moves.length - 1}
                  clock={bottomClock}
                  side={boardFlipped ? "b" : "w"}
                />
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-1 w-11">
              <button
                type="button"
                onClick={() => setBoardFlipped((f) => !f)}
                className="board-nav-btn"
                title="Flip board"
                aria-label="Flip board"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 4l-3 3 3 3" />
                  <path d="M4 7h12a4 4 0 0 1 4 4" />
                  <path d="M17 20l3-3-3-3" />
                  <path d="M20 17H8a4 4 0 0 1-4-4" />
                </svg>
              </button>
              {moves.length > 0 && (
                <>
                  <div className="h-px bg-chess-border my-1" />
                  <button
                    type="button"
                    onClick={() => navigateToMove(-1, false)}
                    className="board-nav-btn"
                    title="Go to start"
                    aria-label="Go to start"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 5h2v14H6zM10 12l8-7v14z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => stepBoardMove(-1)}
                    disabled={!canBoardStepBack}
                    className="board-nav-btn"
                    title="Previous move"
                    aria-label="Previous move"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15 5l-9 7 9 7z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => stepBoardMove(1)}
                    disabled={!canBoardStepForward}
                    className="board-nav-btn board-nav-btn--primary"
                    title="Next move"
                    aria-label="Next move"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 5l9 7-9 7z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToMove(moves.length - 1, false)}
                    className="board-nav-btn"
                    title="Go to end"
                    aria-label="Go to end"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16 5h2v14h-2zM6 5l8 7-8 7z" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {moves.length > 0 && (
              <div className="w-56 flex-shrink-0 flex flex-col bg-chess-panel border border-chess-border rounded-lg overflow-hidden self-stretch shadow-md">
                <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-chess-border bg-chess-bg/40 flex-shrink-0">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-chess-text uppercase tracking-[0.08em]">
                    <span className="h-1.5 w-1.5 rounded-full bg-chess-accent" />
                    Coach
                  </span>
                  <EvalBadge
                    evalResult={displayEval}
                    compact
                    boardFlipped={boardFlipped}
                  />
                </div>
                <div className="flex items-center justify-between px-3 py-2 border-b border-chess-border/70 flex-shrink-0">
                  <span className="text-[11px] text-chess-subtext">
                    Best-move arrow
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowBestMove((b) => !b)}
                    role="switch"
                    aria-checked={showBestMove}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      showBestMove ? "bg-chess-accent" : "bg-chess-border"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                        showBestMove ? "translate-x-[18px]" : "translate-x-[3px]"
                      }`}
                    />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
                  {coachPanel}
                </div>
              </div>
            )}
          </div>
        </div>

        {moves.length > 0 && (
          <EvalChartPanel
            moves={moves}
            currentMoveIndex={currentMoveIdx}
            onMoveSelect={navigateToMove}
            open={desktopEvalGraphOpen}
            onOpenChange={setDesktopEvalGraphOpen}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex-shrink-0 page-inline-pad pt-1.5 pb-0">
        <div className="review-flow-stack w-full">
          <PlayerTag
            compact
            name={boardFlipped ? playerNames.white : playerNames.black}
            color={boardFlipped ? "white" : "black"}
            rating={boardFlipped ? gameMeta?.whiteRating : gameMeta?.blackRating}
            result={gameMeta?.result ?? null}
            isLastMove={currentMoveIdx === moves.length - 1}
            side={boardFlipped ? "w" : "b"}
          />
          <MobileBoardShell
            evalResult={displayEval}
            position={boardPositionFen}
            boardWidth={mobileBoardSize}
            boardOrientation={boardFlipped ? "black" : "white"}
            animationDuration={boardPieceAnimMs}
            remountKey={boardRemountKey}
            dimmed={false}
            continuationActive={continuationActive}
            engineLineGlow={engineLineGlow}
            lastMoveHighlight={boardLastMoveHighlight}
            continuationArrow={continuationArrow}
            showBestMoveArrow={showBestMoveArrow}
            bestMove={currentMove?.bestMove}
            analysisState="done"
            showGameEnd={showBoardGameEnd}
            gameEnd={gameEnd}
            whiteName={playerNames.white}
            blackName={playerNames.black}
            onPrev={(animate = true) => stepBoardMove(-1, animate)}
            onNext={(animate = true) => stepBoardMove(1, animate)}
            canPrev={canBoardStepBack}
            canNext={canBoardStepForward}
          />
          <PlayerTag
            compact
            name={boardFlipped ? playerNames.black : playerNames.white}
            color={boardFlipped ? "black" : "white"}
            rating={boardFlipped ? gameMeta?.blackRating : gameMeta?.whiteRating}
            result={gameMeta?.result ?? null}
            isLastMove={currentMoveIdx === moves.length - 1}
            side={boardFlipped ? "b" : "w"}
            trailing={
              <MobileBoardControls
                moveIndex={currentMoveIdx}
                moveCount={moves.length}
                onFlip={() => setBoardFlipped((f) => !f)}
              />
            }
          />
          {moves.length > 0 && (
            <EvalChartPanel
              moves={moves}
              currentMoveIndex={currentMoveIdx}
              onMoveSelect={navigateToMove}
              open={mobileEvalGraphOpen}
              onOpenChange={setMobileEvalGraphOpen}
              docked
            />
          )}
        </div>
      </div>
      {moves.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain mobile-review-scroll mobile-coach-pane page-inline-pad border-t border-chess-border/40">
          {continuationNav && <EngineLineNavBar nav={continuationNav} />}
          <div className="review-flow-coach">{coachPanel}</div>
        </div>
      )}
    </div>
  );
}

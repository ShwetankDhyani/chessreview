import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AnalyzedMove, EvalResult } from "../types";
import {
  BOARD_START_FEN,
  canAnimateBoardStep,
  highlightFromMove,
  highlightFromUci,
  resolveBoardNavStep,
} from "../utils/boardPosition";
import { hapticSoft, playMoveFeedback } from "../utils/chessSounds";
import { getGameEndInfo } from "../utils/gameEnd";
import { extractClocks, extractGameMeta } from "../utils/gameMeta";
import type { ContinuationNavHandlers } from "../utils/continuationNav";

const BOARD_PLAY_MOVE_MS = 380;

function clockForPlayerAtMove(
  clocks: (number | null)[],
  currentMoveIdx: number,
  wantsBlack: boolean
): number | null {
  for (let i = currentMoveIdx; i >= 0; i--) {
    const isBlackMove = i % 2 === 1;
    if (
      wantsBlack === isBlackMove &&
      clocks[i] !== undefined &&
      clocks[i] !== null
    ) {
      return clocks[i];
    }
  }
  return null;
}

export interface UseReviewBoardSessionOptions {
  moves: AnalyzedMove[];
  pgn?: string;
  whiteName?: string;
  blackName?: string;
  /** When true (default), land on the final move after load — same as post-analysis in the main app. */
  startAtLastMove?: boolean;
}

export function useReviewBoardSession({
  moves,
  pgn,
  whiteName = "White",
  blackName = "Black",
  startAtLastMove = false,
}: UseReviewBoardSessionOptions) {
  const gameMeta = useMemo(() => (pgn ? extractGameMeta(pgn) : null), [pgn]);
  const clocks = useMemo(() => (pgn ? extractClocks(pgn) : []), [pgn]);

  const playerNames = useMemo(
    () => ({
      white: gameMeta?.white ?? whiteName,
      black: gameMeta?.black ?? blackName,
    }),
    [gameMeta, whiteName, blackName]
  );

  const [currentMoveIdx, setCurrentMoveIdx] = useState(-1);
  const [currentFen, setCurrentFen] = useState(BOARD_START_FEN);
  const [currentEval, setCurrentEval] = useState<EvalResult | null>(null);
  const [boardFlipped, setBoardFlipped] = useState(false);
  const [showBestMove, setShowBestMove] = useState(true);
  const [continuationActive, setContinuationActive] = useState(false);
  const [continuationFen, setContinuationFen] = useState<string | null>(null);
  const [continuationEval, setContinuationEval] = useState<EvalResult | null>(null);
  const [continuationArrow, setContinuationArrow] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [continuationNav, setContinuationNav] =
    useState<ContinuationNavHandlers | null>(null);
  const [moveAnim, setMoveAnim] = useState<{ from: string; to: string } | null>(
    null
  );
  const [boardPieceAnimMs, setBoardPieceAnimMs] = useState(0);
  const [boardRemountKey, setBoardRemountKey] = useState(0);

  const currentMoveIdxRef = useRef(-1);
  const currentFenRef = useRef(BOARD_START_FEN);
  const lastRenderedFenRef = useRef(BOARD_START_FEN);
  const boardTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const movesInitRef = useRef<AnalyzedMove[] | null>(null);

  const clearBoardTimers = useCallback(() => {
    boardTimersRef.current.forEach(clearTimeout);
    boardTimersRef.current = [];
  }, []);

  const setBoardToFen = useCallback(
    (
      fen: string,
      highlight: { from: string; to: string } | null,
      animate: boolean
    ) => {
      clearBoardTimers();
      setMoveAnim(highlight);

      const safeToAnimate =
        animate &&
        canAnimateBoardStep(lastRenderedFenRef.current, fen, highlight);

      currentFenRef.current = fen;
      setBoardPieceAnimMs(safeToAnimate ? BOARD_PLAY_MOVE_MS : 0);
      setCurrentFen(fen);
    },
    [clearBoardTimers]
  );

  const resetContinuation = useCallback(() => {
    setContinuationNav(null);
    setContinuationActive(false);
    setContinuationFen(null);
    setContinuationEval(null);
    setContinuationArrow(null);
  }, []);

  const navigateToMove = useCallback(
    (idx: number, animate = true) => {
      resetContinuation();
      clearBoardTimers();
      setMoveAnim(null);
      if (idx >= moves.length) return;

      const fromIdx = currentMoveIdxRef.current;
      const onePly = Math.abs(idx - fromIdx) === 1;
      const { fen, highlight } = resolveBoardNavStep(moves, fromIdx, idx);

      if (idx < 0) {
        if (fromIdx !== -1) hapticSoft();
        setCurrentMoveIdx(-1);
        currentMoveIdxRef.current = -1;
        setCurrentEval(null);
        setBoardToFen(fen, highlight, animate && onePly);
        return;
      }

      const m = moves[idx];
      setCurrentMoveIdx(idx);
      currentMoveIdxRef.current = idx;
      setCurrentEval(m.evalAfter);

      const moveHighlight = highlightFromMove(m);
      if (m.san) {
        playMoveFeedback(m.san);
      } else if (fromIdx !== idx) {
        hapticSoft();
      }

      setBoardToFen(fen, highlight, animate && onePly);
      setMoveAnim(moveHighlight);
    },
    [moves, resetContinuation, clearBoardTimers, setBoardToFen]
  );

  const stepBoardMove = useCallback(
    (delta: number, animate = true) => {
      const next = Math.max(
        -1,
        Math.min(moves.length - 1, currentMoveIdxRef.current + delta)
      );
      navigateToMove(next, animate);
    },
    [moves.length, navigateToMove]
  );

  const handleContinuationFen = useCallback((fen: string | null) => {
    if (!fen) {
      setContinuationFen(null);
      setMoveAnim(null);
      return;
    }
    setContinuationFen(fen);
    setMoveAnim(null);
  }, []);

  const handleContinuationActive = useCallback((active: boolean) => {
    setContinuationActive(active);
  }, []);

  const handleContinuationEval = useCallback((ev: EvalResult | null) => {
    setContinuationEval(ev);
  }, []);

  const handleContinuationArrow = useCallback(
    (arrow: { from: string; to: string } | null) => {
      setContinuationArrow(arrow);
    },
    []
  );

  const handleRegisterContinuationNav = useCallback(
    (nav: ContinuationNavHandlers | null) => {
      setContinuationNav(nav);
    },
    []
  );

  useEffect(() => {
    if (moves.length === 0 || moves === movesInitRef.current) return;
    movesInitRef.current = moves;

    resetContinuation();
    clearBoardTimers();

    if (startAtLastMove) {
      const lastIdx = moves.length - 1;
      const m = moves[lastIdx];
      setCurrentMoveIdx(lastIdx);
      currentMoveIdxRef.current = lastIdx;
      setCurrentEval(m.evalAfter);
      setCurrentFen(m.fenAfter);
      currentFenRef.current = m.fenAfter;
      lastRenderedFenRef.current = m.fenAfter;
      setMoveAnim(highlightFromMove(m));
      setBoardPieceAnimMs(0);
    } else {
      const startFen = moves[0]?.fenBefore ?? BOARD_START_FEN;
      setCurrentMoveIdx(-1);
      currentMoveIdxRef.current = -1;
      setCurrentEval(null);
      setCurrentFen(startFen);
      currentFenRef.current = startFen;
      lastRenderedFenRef.current = startFen;
      setMoveAnim(null);
      setBoardPieceAnimMs(0);
    }
  }, [moves, startAtLastMove, resetContinuation, clearBoardTimers]);

  useEffect(() => {
    currentFenRef.current = currentFen;
  }, [currentFen]);

  useEffect(() => {
    currentMoveIdxRef.current = currentMoveIdx;
  }, [currentMoveIdx]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      lastRenderedFenRef.current = currentFen;
    });
    return () => cancelAnimationFrame(id);
  }, [currentFen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") stepBoardMove(1);
      else if (e.key === "ArrowLeft") stepBoardMove(-1);
      else if (e.key === "Home") navigateToMove(-1, false);
      else if (e.key === "End") navigateToMove(moves.length - 1, false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [stepBoardMove, navigateToMove, moves.length]);

  const currentMove = currentMoveIdx >= 0 ? moves[currentMoveIdx] : null;
  const boardPositionFen = continuationFen ?? currentFen;
  const displayEval = continuationEval ?? currentEval;
  const engineLineGlow =
    continuationActive || !!continuationFen || !!continuationArrow;

  const boardLastMoveHighlight = useMemo(() => {
    // Only leave the game-move highlight when browsing a continuation fen.
    if (continuationFen) {
      if (currentMoveIdx > 0) {
        return highlightFromMove(moves[currentMoveIdx - 1] ?? {});
      }
      return null;
    }
    if (currentMoveIdx >= 0) {
      return highlightFromMove(moves[currentMoveIdx] ?? {}) ?? moveAnim;
    }
    return moveAnim;
  }, [continuationFen, moveAnim, currentMoveIdx, moves]);

  const gameEnd = useMemo(() => {
    if (!gameMeta?.result || gameMeta.result === "*") return null;
    const finalFen =
      moves.length > 0 ? moves[moves.length - 1].fenAfter : undefined;
    return getGameEndInfo(
      gameMeta.result,
      gameMeta.termination,
      playerNames.white,
      playerNames.black,
      finalFen
    );
  }, [gameMeta, moves, playerNames.white, playerNames.black]);

  const atGameEnd = moves.length > 0 && currentMoveIdx === moves.length - 1;
  const showBoardGameEnd = !!gameEnd && atGameEnd && !continuationFen;

  const canBoardStepBack = moves.length > 0 && currentMoveIdx > -1;
  const canBoardStepForward =
    moves.length > 0 && currentMoveIdx < moves.length - 1;

  const topClock = clockForPlayerAtMove(
    clocks,
    currentMoveIdx,
    !boardFlipped
  );
  const bottomClock = clockForPlayerAtMove(
    clocks,
    currentMoveIdx,
    boardFlipped
  );

  return {
    moves,
    playerNames,
    gameMeta,
    currentMoveIdx,
    currentMove,
    currentEval,
    displayEval,
    boardPositionFen,
    boardLastMoveHighlight,
    boardFlipped,
    setBoardFlipped,
    showBestMove,
    setShowBestMove,
    continuationActive,
    continuationFen,
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
  };
}

export type ReviewBoardSession = ReturnType<typeof useReviewBoardSession>;

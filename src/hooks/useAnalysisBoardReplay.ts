import { useEffect, useRef } from "react";
import type { ReplayFrame } from "../utils/pgnReplay";
import { progressToReplayPly } from "../utils/pgnReplay";
import { BOARD_START_FEN, sameFen } from "../utils/boardPosition";

const PLY_INTERVAL_MS = 500;

interface UseAnalysisBoardReplayOptions {
  active: boolean;
  replayFrames: ReplayFrame[];
  progressDone: number;
  progressTotal: number;
  setBoardToFen: (
    fen: string,
    highlight: { from: string; to: string } | null,
    animate: boolean
  ) => void;
  getCurrentFen: () => string;
  clearBoardTimers: () => void;
  setMoveAnim: (anim: { from: string; to: string } | null) => void;
}

/**
 * While analysis runs, replay the loaded PGN one ply at a time (never burst).
 */
export function useAnalysisBoardReplay({
  active,
  replayFrames,
  progressDone,
  progressTotal,
  setBoardToFen,
  getCurrentFen,
  clearBoardTimers,
  setMoveAnim,
}: UseAnalysisBoardReplayOptions) {
  const smoothPlyRef = useRef(-1);
  const targetPlyRef = useRef(-1);
  const busyRef = useRef(false);
  const framesRef = useRef(replayFrames);
  framesRef.current = replayFrames;

  useEffect(() => {
    targetPlyRef.current = progressToReplayPly(
      progressDone,
      progressTotal,
      replayFrames.length
    );
  }, [progressDone, progressTotal, replayFrames.length]);

  useEffect(() => {
    if (!active) {
      smoothPlyRef.current = -1;
      targetPlyRef.current = -1;
      busyRef.current = false;
      return;
    }

    smoothPlyRef.current = -1;
    targetPlyRef.current = -1;
    busyRef.current = false;
    clearBoardTimers();
    setMoveAnim(null);
    setBoardToFen(BOARD_START_FEN, null, false);
  }, [active, replayFrames, clearBoardTimers, setMoveAnim, setBoardToFen]);

  useEffect(() => {
    if (!active || replayFrames.length === 0) return;

    const advanceOnePly = () => {
      if (busyRef.current) return;

      const frames = framesRef.current;
      const target = targetPlyRef.current;
      if (frames.length === 0 || smoothPlyRef.current >= target) return;

      const next = smoothPlyRef.current + 1;
      if (next < 0 || next >= frames.length) return;

      const frame = frames[next];
      const prior =
        next === 0 ? BOARD_START_FEN : frames[next - 1].fenAfter;
      const canAnimate = sameFen(getCurrentFen(), prior);

      busyRef.current = true;
      smoothPlyRef.current = next;

      setBoardToFen(
        frame.fenAfter,
        { from: frame.from, to: frame.to },
        canAnimate
      );

      window.setTimeout(() => {
        busyRef.current = false;
      }, PLY_INTERVAL_MS);
    };

    const id = window.setInterval(advanceOnePly, PLY_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [active, replayFrames.length, setBoardToFen, getCurrentFen]);
}

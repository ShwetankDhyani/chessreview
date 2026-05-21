import { useEffect, useRef } from "react";
import type { ReplayFrame } from "../utils/pgnReplay";
import { progressToReplayPly } from "../utils/pgnReplay";

const PLY_INTERVAL_MS = 500;

interface UseAnalysisBoardReplayOptions {
  active: boolean;
  replayFrames: ReplayFrame[];
  progressDone: number;
  progressTotal: number;
  playMoveOnBoard: (
    fenBefore: string,
    fenAfter: string,
    fromSq: string,
    toSq: string,
    skipSetup: boolean
  ) => void;
  fadeBoardToFen: (fen: string) => void;
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
  playMoveOnBoard,
  fadeBoardToFen,
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
    fadeBoardToFen("start");
  }, [active, replayFrames, clearBoardTimers, fadeBoardToFen, setMoveAnim]);

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
      busyRef.current = true;
      smoothPlyRef.current = next;

      playMoveOnBoard(
        frame.fenBefore,
        frame.fenAfter,
        frame.from,
        frame.to,
        next > 0
      );

      window.setTimeout(() => {
        busyRef.current = false;
      }, PLY_INTERVAL_MS);
    };

    const id = window.setInterval(advanceOnePly, PLY_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [active, replayFrames.length, playMoveOnBoard]);
}

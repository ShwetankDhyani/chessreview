import { useEffect, useRef } from "react";
import type { ReplayFrame } from "../utils/pgnReplay";
import { progressToReplayPly } from "../utils/pgnReplay";

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
 * While analysis runs, replay the loaded PGN on the board in sync with progress %.
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
  const replayPlyRef = useRef(-1);
  const smoothPlyRef = useRef(-1);
  const framesRef = useRef(replayFrames);
  framesRef.current = replayFrames;

  useEffect(() => {
    if (!active) {
      replayPlyRef.current = -1;
      smoothPlyRef.current = -1;
      return;
    }

    replayPlyRef.current = -1;
    smoothPlyRef.current = -1;
    clearBoardTimers();
    setMoveAnim(null);
    fadeBoardToFen("start");
  }, [active, replayFrames, clearBoardTimers, fadeBoardToFen, setMoveAnim]);

  useEffect(() => {
    if (!active || replayFrames.length === 0) return;

    const maxPly = progressToReplayPly(
      progressDone,
      progressTotal,
      replayFrames.length
    );

    const tick = () => {
      const frames = framesRef.current;
      if (frames.length === 0 || smoothPlyRef.current >= maxPly) return;

      const next = smoothPlyRef.current + 1;
      smoothPlyRef.current = next;
      if (next < 0 || next >= frames.length) return;

      const frame = frames[next];
      const skipSetup = next > 0;
      playMoveOnBoard(
        frame.fenBefore,
        frame.fenAfter,
        frame.from,
        frame.to,
        skipSetup
      );
      replayPlyRef.current = next;
    };

    tick();
    const id = window.setInterval(tick, 340);
    return () => window.clearInterval(id);
  }, [active, replayFrames.length, progressDone, progressTotal, playMoveOnBoard]);
}

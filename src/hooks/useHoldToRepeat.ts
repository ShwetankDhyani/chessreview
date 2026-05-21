import { useCallback, useRef } from "react";

const HOLD_DELAY_MS = 400;
const REPEAT_MS = 300;

/**
 * Short tap → `onTap` (animated step).
 * Hold → after delay, repeat `onHoldStep` (no animation, for scrubbing).
 */
export function useHoldToRepeat(
  onTap: () => void,
  onHoldStep: () => void,
  enabled: boolean
) {
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdActiveRef = useRef(false);
  // Tracks whether the current pointer interaction has already been
  // finalised. Without this, onPointerUp and onPointerLeave both fire on a
  // single tap and onTap runs twice → the board advances two plies.
  const finishedRef = useRef(true);

  const clear = useCallback(() => {
    if (holdRef.current) clearTimeout(holdRef.current);
    if (repeatRef.current) clearInterval(repeatRef.current);
    holdRef.current = null;
    repeatRef.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      holdActiveRef.current = false;
      finishedRef.current = false;
      clear();
      holdRef.current = setTimeout(() => {
        holdActiveRef.current = true;
        onHoldStep();
        repeatRef.current = setInterval(onHoldStep, REPEAT_MS);
      }, HOLD_DELAY_MS);
    },
    [enabled, onHoldStep, clear]
  );

  const end = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const wasHold = holdActiveRef.current;
    clear();
    holdActiveRef.current = false;
    if (!wasHold && enabled) onTap();
  }, [enabled, onTap, clear]);

  return {
    onPointerDown,
    onPointerUp: end,
    onPointerCancel: end,
    onPointerLeave: end,
  };
}

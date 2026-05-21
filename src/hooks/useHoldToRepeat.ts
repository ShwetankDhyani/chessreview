import { useCallback, useRef } from "react";

const HOLD_DELAY_MS = 320;
const REPEAT_MS = 85;

/** Tap once on release; hold to repeat `onStep` quickly */
export function useHoldToRepeat(onStep: () => void, enabled: boolean) {
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const repeatingRef = useRef(false);

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
      repeatingRef.current = false;
      clear();
      holdRef.current = setTimeout(() => {
        repeatingRef.current = true;
        onStep();
        repeatRef.current = setInterval(onStep, REPEAT_MS);
      }, HOLD_DELAY_MS);
    },
    [enabled, onStep, clear]
  );

  const end = useCallback(() => {
    const wasRepeating = repeatingRef.current;
    clear();
    if (!wasRepeating && enabled) onStep();
  }, [enabled, onStep, clear]);

  return {
    onPointerDown,
    onPointerUp: end,
    onPointerCancel: end,
    onPointerLeave: end,
  };
}

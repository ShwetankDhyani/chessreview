import { useEffect, useRef, useState } from "react";
import type { AnalysisState } from "../types";

/**
 * Smooths analysis % for UI — avoids sitting at 0% then jumping to 60%.
 * Creeps upward between real engine updates; never decreases while analyzing.
 */
export function useSmoothAnalysisProgress(
  state: AnalysisState,
  rawPercent: number
): number {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  const targetRef = useRef(0);
  const lastRealRef = useRef(0);
  const prevStateRef = useRef<AnalysisState>(state);

  useEffect(() => {
    targetRef.current = Math.max(targetRef.current, rawPercent);
    lastRealRef.current = Date.now();
  }, [rawPercent]);

  useEffect(() => {
    if (state === "analyzing" && prevStateRef.current !== "analyzing") {
      const seed = Math.max(4, Math.min(99, rawPercent));
      displayRef.current = seed;
      targetRef.current = seed;
      lastRealRef.current = Date.now();
    }
    prevStateRef.current = state;

    if (state === "idle" || state === "loading") {
      displayRef.current = 0;
      targetRef.current = 0;
      setDisplay(0);
      return;
    }

    if (state === "done") {
      displayRef.current = 100;
      targetRef.current = 100;
      setDisplay(100);
      return;
    }

    if (state === "error") {
      return;
    }

    // analyzing — start visible immediately
    displayRef.current = Math.max(displayRef.current, 4);
    targetRef.current = Math.max(targetRef.current, 4, rawPercent);
    setDisplay(displayRef.current);

    const tick = window.setInterval(() => {
      const now = Date.now();
      let target = Math.max(targetRef.current, rawPercent);

      if (target < 90 && now - lastRealRef.current > 350) {
        target = Math.min(90, target + 0.4);
        targetRef.current = target;
      }

      const cur = displayRef.current;
      const gap = target - cur;
      const step =
        gap <= 0 ? 0.2 : Math.max(0.3, Math.min(2.2, gap * 0.1));
      const next = Math.min(99, cur + step);
      displayRef.current = next;
      setDisplay(next);
    }, 45);

    return () => window.clearInterval(tick);
  }, [state, rawPercent]);

  if (state === "done") return 100;
  return Math.min(99, Math.round(display));
}

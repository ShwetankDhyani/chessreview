import { useEffect, useRef, useState } from "react";
import type { AnalysisState } from "../types";
import { computePredictedProgress } from "../utils/analysisProgressUi";
import {
  predictReviewDurationMs,
  type ReviewTimingModel,
} from "../utils/reviewTiming";

export interface PredictedAnalysisProgress {
  percent: number;
  remainingMs: number;
}

/**
 * Progress driven by adaptive predicted review duration, recalibrated against engine milestones.
 */
export function usePredictedAnalysisProgress(
  state: AnalysisState,
  rawPercent: number,
  startedAt: number | null,
  plies: number,
  depth: number,
  timingModel: ReviewTimingModel | null
): PredictedAnalysisProgress {
  const [result, setResult] = useState<PredictedAnalysisProgress>({
    percent: 0,
    remainingMs: 0,
  });
  const displayRef = useRef(0);
  const predictedMsRef = useRef(
    predictReviewDurationMs(plies, depth, timingModel)
  );
  const prevStateRef = useRef<AnalysisState>(state);

  useEffect(() => {
    predictedMsRef.current = predictReviewDurationMs(
      plies,
      depth,
      timingModel
    );
  }, [plies, depth, timingModel]);

  useEffect(() => {
    if (state === "analyzing" && prevStateRef.current !== "analyzing") {
      predictedMsRef.current = predictReviewDurationMs(
        plies,
        depth,
        timingModel
      );
      displayRef.current = 2;
      setResult({
        percent: 2,
        remainingMs: predictedMsRef.current,
      });
    }
    prevStateRef.current = state;

    if (state === "idle" || state === "loading") {
      displayRef.current = 0;
      setResult({ percent: 0, remainingMs: 0 });
      return;
    }

    if (state === "done") {
      displayRef.current = 100;
      setResult({ percent: 100, remainingMs: 0 });
      return;
    }

    if (state === "error") return;

    if (startedAt === null) return;

    const tick = () => {
      const elapsedMs = Date.now() - startedAt;
      const step = computePredictedProgress({
        elapsedMs,
        predictedMs: predictedMsRef.current,
        rawPercent,
        prevDisplay: displayRef.current,
      });
      predictedMsRef.current = step.predictedMs;
      displayRef.current = step.display;
      setResult({
        percent: step.display,
        remainingMs: Math.max(0, step.predictedMs - elapsedMs),
      });
    };

    tick();
    const id = window.setInterval(tick, 120);
    return () => window.clearInterval(id);
  }, [state, rawPercent, startedAt, plies, depth, timingModel]);

  if (state === "done" || rawPercent >= 100) {
    return { percent: 100, remainingMs: 0 };
  }

  return result;
}

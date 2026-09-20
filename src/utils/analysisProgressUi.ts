/** Predict total review runtime from game size, depth, and learned timing history. */
export { predictReviewDurationMs as estimateAnalysisDurationMs } from "./reviewTiming";

export interface PredictedProgressInput {
  elapsedMs: number;
  predictedMs: number;
  rawPercent: number;
  prevDisplay: number;
}

export interface PredictedProgressResult {
  display: number;
  predictedMs: number;
}

/**
 * Progress follows predicted wall-clock time. Engine milestones only extend the estimate.
 */
export function computePredictedProgress({
  elapsedMs,
  predictedMs,
  rawPercent,
  prevDisplay,
}: PredictedProgressInput): PredictedProgressResult {
  let predicted = predictedMs;

  if (rawPercent >= 100) {
    return { display: 100, predictedMs: predicted };
  }

  // Running past the guess — stretch the timeline so the bar keeps moving honestly.
  if (elapsedMs > predicted * 0.9) {
    const overrun = elapsedMs / Math.max(predicted, 1);
    if (overrun > 1) {
      predicted = Math.max(predicted, elapsedMs * 1.1);
    } else {
      predicted = Math.max(predicted, elapsedMs / 0.86);
    }
  }

  // Engine still early vs elapsed — review is slower than history suggested.
  if (rawPercent >= 6 && elapsedMs > 3000) {
    const timeShare = elapsedMs / Math.max(predicted, 1);
    const engineShare = rawPercent / 100;
    if (engineShare < timeShare * 0.45) {
      const impliedTotal = elapsedMs / Math.max(engineShare, 0.04);
      if (impliedTotal > predicted * 1.08) {
        predicted = Math.min(predicted * 2.6, impliedTotal * 1.06);
      }
    }
  }

  // Post-batch classify tail
  if (rawPercent >= 88) {
    const tailBudget =
      rawPercent >= 98 ? 1500 : rawPercent >= 94 ? 3200 : 5200;
    const needed = elapsedMs + tailBudget;
    if (predicted < needed) predicted = needed;
  }

  const ratio = Math.min(1, elapsedMs / Math.max(predicted, 1));
  const eased = 1 - Math.pow(1 - ratio, 1.55);
  const timePct = eased * 97;

  let display = Math.max(prevDisplay, timePct);

  if (rawPercent >= 99 && display < 96) {
    display = Math.min(97, display + 0.12);
  }

  return {
    display: Math.min(97, Math.round(display * 10) / 10),
    predictedMs: Math.round(predicted),
  };
}

/** Human-readable stage for analysis progress (matches gameReview phases). */
export function analysisStageLabel(percent: number, depth: number): string {
  const p = Math.max(0, Math.min(100, percent));
  if (p < 6) return "Connecting to engine…";
  if (p < 14) return "Reading your game…";
  if (p < 72) return `Evaluating positions · depth ${depth}`;
  if (p < 84) return "Checking best lines…";
  if (p < 92) return "Spotting strong moves…";
  if (p < 100) return "Grading every move…";
  return "Finishing up…";
}

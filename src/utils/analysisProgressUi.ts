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
 * Time-based % capped by engine milestones — avoids racing to 99% while work continues.
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

  // Engine ahead of schedule — extend estimate instead of jumping the bar.
  if (rawPercent >= 8 && elapsedMs > 2500) {
    const impliedTotal = elapsedMs / (rawPercent / 100);
    if (impliedTotal > predicted * 1.12) {
      predicted = Math.min(predicted * 2.8, impliedTotal * 1.08);
    }
  }

  // Post-batch / classify tail often takes longer than the batch itself.
  if (rawPercent >= 88) {
    const tailBudget =
      rawPercent >= 98 ? 1200 : rawPercent >= 94 ? 2800 : 4500;
    const needed = elapsedMs + tailBudget;
    if (predicted < needed) predicted = needed;
  }

  const ratio = Math.min(1.02, elapsedMs / Math.max(predicted, 1));
  const eased = 1 - Math.pow(1 - ratio, 2.15);
  const timePct = eased * 95;

  const engineCap = Math.min(96, rawPercent + 1);
  let display = Math.min(timePct, engineCap);
  display = Math.max(display, prevDisplay);

  // Gentle finish when engine is done but UI time curve lags.
  if (rawPercent >= 99 && display < 98) {
    display = Math.min(98, display + 0.08);
  }

  return {
    display: Math.min(98, Math.round(display)),
    predictedMs: predicted,
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

export function formatEtaSeconds(seconds: number | null): string | null {
  if (seconds === null) return null;
  if (seconds < 5) return "A few seconds left";
  if (seconds < 60) return `~${seconds}s left`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s < 8) return `~${m} min left`;
  return `~${m}m ${s}s left`;
}

export function remainingEtaSeconds(remainingMs: number): number | null {
  if (remainingMs < 1500) return null;
  return Math.max(1, Math.round(remainingMs / 1000));
}

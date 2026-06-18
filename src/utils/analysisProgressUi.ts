/** Human-readable stage for analysis progress (matches gameReview phases). */
export function analysisStageLabel(percent: number, depth: number): string {
  const p = Math.max(0, Math.min(100, percent));
  if (p < 6) return "Connecting to engine…";
  if (p < 14) return "Reading your game…";
  if (p < 88) return `Evaluating positions · depth ${depth}`;
  if (p < 94) return "Checking best lines…";
  if (p < 98) return "Spotting strong moves…";
  if (p < 100) return "Grading every move…";
  return "Finishing up…";
}

/** Rough ETA from elapsed time and current %; null when too early to estimate. */
export function estimateAnalysisEtaSeconds(
  percent: number,
  elapsedMs: number
): number | null {
  const p = Math.max(0, Math.min(99, percent));
  if (p < 10 || elapsedMs < 2500) return null;
  const totalMs = elapsedMs / (p / 100);
  const remaining = Math.max(0, totalMs - elapsedMs);
  return Math.round(remaining / 1000);
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

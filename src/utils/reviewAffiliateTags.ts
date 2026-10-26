import type { AnalyzedMove, PhaseAccuracyStats, ReviewSummary } from "../types";
import { computePhaseAccuracies } from "../analysis/gamePhases";

/**
 * Map a finished review to affiliate tags for contextual recommendations.
 */
export function tagsFromReview(
  summary: ReviewSummary,
  moves: AnalyzedMove[]
): { tags: string[]; primaryWeakness: string } {
  const phases: PhaseAccuracyStats = computePhaseAccuracies(moves);
  const tags: string[] = [];
  let primaryWeakness = "your next games";

  const blunders = summary.white.blunder + summary.black.blunder;
  const mistakes = summary.white.mistake + summary.black.mistake;
  const inaccuracies = summary.white.inaccuracy + summary.black.inaccuracy;

  const avg = (w: number | null, b: number | null) =>
    ((w ?? 0) + (b ?? 0)) / 2;

  const opening = avg(phases.opening.white, phases.opening.black);
  const middle = avg(phases.middlegame.white, phases.middlegame.black);
  const end = avg(phases.endgame.white, phases.endgame.black);

  if (opening < 70) {
    tags.push("opening", "fundamentals", "beginner");
    primaryWeakness = "opening play";
  }
  if (blunders >= 3 || mistakes >= 4) {
    tags.push("tactics", "blunders", "puzzles", "calculation");
    if (primaryWeakness === "your next games") {
      primaryWeakness = "tactical vision";
    }
  }
  if (end < 70) {
    tags.push("endgame", "technique");
    if (primaryWeakness === "your next games") {
      primaryWeakness = "endgame technique";
    }
  }
  if (middle < 70 && inaccuracies >= 4) {
    tags.push("strategy", "planning", "middlegame");
    if (primaryWeakness === "your next games") {
      primaryWeakness = "middlegame planning";
    }
  }

  if (tags.length === 0) {
    tags.push("strategy", "book", "training");
  }

  return { tags, primaryWeakness };
}

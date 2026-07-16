import type { MoveClassification } from "../types";

/**
 * Show the played-move classification badge whenever the board is still on
 * the game position (not stepped into an engine continuation).
 *
 * Important: mounting the "better line" viewer for inaccuracy/mistake/blunder
 * must NOT hide the badge — only exploring the line (continuationFen set) should.
 */
export function boardMoveClassification(
  classification: MoveClassification | null | undefined,
  opts: { continuationFen?: string | null; isAnalyzing?: boolean }
): MoveClassification | null {
  if (opts.isAnalyzing) return null;
  if (opts.continuationFen) return null;
  return classification ?? null;
}

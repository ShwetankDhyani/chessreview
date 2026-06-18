import { analyzeGameReview } from "../analysis/gameReview";
import { getOpeningBook } from "../analysis/openingBookData";
import type { ReviewResult } from "../types";

/** Analyze a PGN via v3 expected-points review (native batch + WASM MultiPV fallback). */
export async function analyzePgn(
  pgn: string,
  onProgress?: (done: number, total: number) => void,
  depth = 18
): Promise<ReviewResult> {
  return analyzeGameReview(pgn, {
    depth: Math.max(14, depth),
    minDepth: 14,
    multiPv: 2,
    openingBook: getOpeningBook(),
    onProgress: (done, total) => {
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      onProgress?.(pct, 100);
    },
  });
}

import { analyzeGameReview } from "../analysis/gameReview";
import type { ReviewResult } from "../types";

/**
 * Analyze a PGN using Chess.com-style expected-points review (Stockfish WASM MultiPV).
 */
export async function analyzePgn(
  pgn: string,
  onProgress?: (done: number, total: number) => void,
  depth = 18
): Promise<ReviewResult> {
  return analyzeGameReview(pgn, {
    depth: Math.max(18, depth),
    minDepth: 18,
    multiPv: 2,
    onProgress: (done, total) => {
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      onProgress?.(pct, 100);
    },
  });
}

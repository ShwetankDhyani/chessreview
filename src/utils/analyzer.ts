import { analyzeGameReview } from "../analysis/gameReview";
import { getOpeningBook } from "../analysis/openingBookData";
import type { ReviewResult } from "../types";

export interface AnalyzePgnOptions {
  whiteRating?: number | null;
  blackRating?: number | null;
  /** Cancels engine work in progress, not merely its result. */
  signal?: AbortSignal | null;
}

/** Analyze a PGN via v3.2 WDL-aware full-depth review (native batch + miss-only WASM fill). */
export async function analyzePgn(
  pgn: string,
  onProgress?: (done: number, total: number) => void,
  depth = 18,
  opts?: AnalyzePgnOptions
): Promise<ReviewResult> {
  const resolvedDepth = Math.max(14, depth);
  return analyzeGameReview(pgn, {
    depth: resolvedDepth,
    minDepth: 14,
    multiPv: 3,
    openingBook: getOpeningBook(),
    whiteRating: opts?.whiteRating,
    blackRating: opts?.blackRating,
    signal: opts?.signal,
    onProgress: (done, total) => {
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      onProgress?.(pct, 100);
    },
  });
}

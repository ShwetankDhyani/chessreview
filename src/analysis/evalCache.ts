import {
  evaluateFensBatch,
  evaluateFen,
} from "../engine/evaluationService";
import type { EvalResult } from "../types";
import type { PositionAnalysis, MultiPvLine } from "./types";

export function evalResultToPositionAnalysis(
  fen: string,
  ev: EvalResult
): PositionAnalysis {
  const line: MultiPvLine = {
    multipv: 1,
    cp: ev.cp,
    mate: ev.mate,
    wdl: ev.wdl,
    depth: ev.depth,
    pv: ev.pv ?? [],
    bestMove: ev.bestMove ?? ev.pv?.[0],
  };
  return { fen, depth: ev.depth, lines: [line] };
}

function withFullDepthMeta(ev: EvalResult, requestedDepth: number): EvalResult {
  const depth = ev.depth ?? 0;
  const verified = depth >= requestedDepth;
  return {
    ...ev,
    targetDepth: requestedDepth,
    verified,
    confidence: verified ? 0.95 : depth > 0 ? 0.7 : 0.2,
    unverifiedReason: verified
      ? undefined
      : depth > 0
        ? "shallow_depth"
        : "missing_eval",
  };
}

/**
 * Full-depth path: evaluate every unique FEN once at the requested depth.
 * No shallow pass, no 45% deepen subset. Misses are retried at the same depth.
 */
export async function buildBatchPositionCache(
  fens: string[],
  depth: number,
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, PositionAnalysis>> {
  const unique = [...new Set(fens)];
  if (!unique.length) return new Map();

  const evals = await evaluateFensBatch(unique, depth, onProgress);

  const missing = unique.filter((fen) => {
    const ev = evals.get(fen);
    return !ev || !(ev.depth > 0);
  });

  for (const fen of missing) {
    try {
      const fallback = await evaluateFen(fen, depth);
      if (fallback?.depth && fallback.depth > 0) {
        evals.set(fen, fallback);
      }
    } catch {
      /* leave missing — caller decides WASM / fail */
    }
    onProgress?.(evals.size, unique.length);
  }

  const cache = new Map<string, PositionAnalysis>();
  for (const [fen, ev] of evals) {
    if (!(ev.depth > 0)) continue;
    const tagged = withFullDepthMeta(ev, depth);
    cache.set(fen, evalResultToPositionAnalysis(fen, tagged));
  }
  return cache;
}

/** True only when every required FEN has a usable eval (no 85% shortcut). */
export function batchCacheIsUsable(
  cache: Map<string, PositionAnalysis>,
  requiredFens: string[]
): boolean {
  if (requiredFens.length === 0) return true;
  if (cache.size === 0) return false;
  for (const fen of requiredFens) {
    if (!cache.has(fen)) return false;
  }
  return true;
}

/**
 * Fill only missing FENs via WASM MultiPV — never re-analyze the whole game.
 */
export interface FillMissingOptions {
  onProgress?: (done: number, total: number) => void;
  /** User cancellation; stops before the next position. */
  signal?: AbortSignal | null;
  /**
   * Wall-clock ceiling for the whole backfill.
   *
   * Positions are analysed one at a time and each may take up to its own
   * timeout, so a long game could otherwise keep going for hours. Stopping
   * early leaves those positions unanalysed, which the review already renders
   * as unverified rather than treating as an error.
   */
  budgetMs?: number;
}

export async function fillMissingWithWasm(
  cache: Map<string, PositionAnalysis>,
  requiredFens: string[],
  depth: number,
  multiPv: number,
  analyzePositionMultiPv: (
    fen: string,
    opts: {
      depth: number;
      multiPv: number;
      signal?: AbortSignal | null;
    }
  ) => Promise<PositionAnalysis>,
  options: FillMissingOptions | ((done: number, total: number) => void) = {}
): Promise<void> {
  const opts: FillMissingOptions =
    typeof options === "function" ? { onProgress: options } : options;
  const { onProgress, signal, budgetMs } = opts;

  const missing = requiredFens.filter((fen) => !cache.has(fen));
  const endsAt =
    budgetMs != null && budgetMs > 0 ? Date.now() + budgetMs : null;

  let done = 0;
  for (const fen of missing) {
    if (signal?.aborted) break;
    if (endsAt != null && Date.now() >= endsAt) break;

    try {
      const analysis = await analyzePositionMultiPv(fen, {
        depth,
        multiPv,
        signal,
      });
      if (analysis.lines.length > 0) cache.set(fen, analysis);
    } catch {
      /* leave missing */
    }
    done++;
    onProgress?.(done, missing.length);
  }
}

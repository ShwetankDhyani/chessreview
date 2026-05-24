import {
  evaluateFensConsensus,
  evalToCp,
  isNativeEngineActive,
  refreshNativeEngineProbe,
} from "../engine/evaluationService";
import type { EvalResult } from "../types";
import type { PositionAnalysis, MultiPvLine } from "./types";
import { analyzePositionMultiPv } from "./stockfishClient";

const MIN_VERIFY_DEPTH = 10;
const MAX_MULTIPV_GREAT_PLIES = 12;

export function evalResultToPositionAnalysis(
  fen: string,
  ev: EvalResult
): PositionAnalysis {
  const line: MultiPvLine = {
    multipv: 1,
    cp: ev.cp,
    mate: ev.mate,
    depth: ev.depth,
    pv: ev.pv ?? [],
    bestMove: ev.bestMove ?? ev.pv?.[0],
  };
  return { fen, depth: ev.depth, lines: [line] };
}

/**
 * Fast path: batch-eval all positions via native server / cloud / single-PV WASM.
 */
export async function buildBatchPositionCache(
  fens: string[],
  depth: number,
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, PositionAnalysis>> {
  const unique = [...new Set(fens)];
  if (!unique.length) return new Map();

  await refreshNativeEngineProbe();

  const fastDepth = Math.max(10, Math.min(depth, 12));
  const deepDepth = Math.max(fastDepth + 2, depth);
  const maxDeep = Math.max(24, Math.min(96, Math.floor(unique.length * 0.45)));

  const { evals } = await evaluateFensConsensus(
    unique,
    {
      requestedDepth: depth,
      fastDepth,
      deepDepth,
      minVerifiedDepth: MIN_VERIFY_DEPTH,
      maxDeepPositions: maxDeep,
      disagreementCpForLowConfidence: 90,
    },
    onProgress
  );

  const cache = new Map<string, PositionAnalysis>();
  for (const [fen, ev] of evals) {
    if (ev.depth > 0) cache.set(fen, evalResultToPositionAnalysis(fen, ev));
  }
  return cache;
}

/** True if batch path likely has enough coverage to skip per-FEN WASM MultiPV. */
export function batchCacheIsUsable(
  cache: Map<string, PositionAnalysis>,
  requiredFens: string[]
): boolean {
  if (cache.size === 0) return false;
  let hit = 0;
  for (const fen of requiredFens) {
    if (cache.has(fen)) hit++;
  }
  return hit >= requiredFens.length * 0.85;
}

/**
 * MultiPV on a few plies only (Great-move detection) — not the whole game.
 */
const GREAT_ENRICH_TIMEOUT_MS = 12_000;

export async function enrichGreatMoveCandidates(
  cache: Map<string, PositionAnalysis>,
  candidates: string[],
  depth: number,
  multiPv = 2,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const unique = [...new Set(candidates)].slice(0, MAX_MULTIPV_GREAT_PLIES);
  let done = 0;
  for (const fen of unique) {
    try {
      const analysis = await analyzePositionMultiPv(fen, {
        depth: Math.min(depth, 14),
        multiPv,
        timeoutMs: GREAT_ENRICH_TIMEOUT_MS,
      });
      if (analysis.lines.length >= 2) cache.set(fen, analysis);
    } catch {
      /* skip — Great detection optional for this ply */
    }
    done++;
    onProgress?.(done, unique.length);
  }
}

export function cpWhiteFromCache(
  cache: Map<string, PositionAnalysis>,
  fen: string
): number {
  const line = cache.get(fen)?.lines[0];
  if (!line) return 0;
  if (line.mate !== undefined) return line.mate > 0 ? 10000 : -10000;
  return line.cp ?? 0;
}

export function strictCpMapFromCache(
  cache: Map<string, PositionAnalysis>
): Map<string, number> {
  const out = new Map<string, number>();
  for (const [fen, analysis] of cache) {
    const ev: EvalResult = {
      cp: analysis.lines[0]?.cp,
      mate: analysis.lines[0]?.mate,
      depth: analysis.depth,
      source: "local",
    };
    if (ev.depth >= MIN_VERIFY_DEPTH) out.set(fen, evalToCp(ev));
  }
  return out;
}

export { isNativeEngineActive };

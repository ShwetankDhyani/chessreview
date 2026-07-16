import type { EvalResult } from "../types";

// Native server: dev → localhost:8765 | production → VITE_EVAL_SERVER_URL (tunnel/VPS)
export const EVAL_SERVER_URL = (
  import.meta.env.VITE_EVAL_SERVER_URL as string | undefined
)?.replace(/\/$/, "") ?? (import.meta.env.DEV ? "http://127.0.0.1:8765" : "");

const LOCAL_SERVER = EVAL_SERVER_URL;
const HEALTH_TIMEOUT_MS = 8000;
const EVAL_TIMEOUT_MS = 45000;
const BATCH_TIMEOUT_MS = 600_000;
/** Larger chunks = fewer tunnel round-trips per game on laptop server */
const BATCH_CHUNK_SIZE = 96;
const PROBE_UP_TTL_MS = 45_000;
const PROBE_DOWN_RETRY_MS = 6_000;
const BATCH_QUEUE_POLL_MS = 1200;

export interface EvalQueueStatus {
  state: "idle" | "queued" | "running";
  position: number | null;
  etaMs: number | null;
  chunkDone: number;
  chunkTotal: number;
}

const queueListeners = new Set<(status: EvalQueueStatus) => void>();

function emitQueueStatus(status: EvalQueueStatus) {
  for (const fn of queueListeners) fn(status);
}

export function subscribeEvalQueueStatus(
  listener: (status: EvalQueueStatus) => void
): () => void {
  queueListeners.add(listener);
  return () => queueListeners.delete(listener);
}

type ProbeState = "unknown" | "up" | "down";
let probeState: ProbeState = "unknown";
let lastProbeMs = 0;
/** When native server is up, skip Lichess/WASM for speed and full-game depth */
let nativeEngineExclusive = false;

export function isNativeEngineActive(): boolean {
  return nativeEngineExclusive;
}

export function getEvalBackend(): "native" | "cloud" | "browser" | "unavailable" {
  if (probeState === "up") return "native";
  if (EVAL_SERVER_URL && probeState === "down") return "unavailable";
  return "cloud";
}

async function probeLocalServer(): Promise<boolean> {
  if (!LOCAL_SERVER) return false;
  try {
    const res = await fetch(`${LOCAL_SERVER}/health`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.ok === true;
  } catch {
    return false;
  }
}

async function ensureLocalServer(force = false): Promise<boolean> {
  if (!LOCAL_SERVER) return false;
  const now = Date.now();
  if (!force) {
    if (probeState === "up" && now - lastProbeMs < PROBE_UP_TTL_MS) return true;
    if (probeState === "down" && now - lastProbeMs < PROBE_DOWN_RETRY_MS) {
      return false;
    }
  }
  lastProbeMs = now;
  const ok = await probeLocalServer();
  probeState = ok ? "up" : "down";
  nativeEngineExclusive = ok;
  if (ok) {
    console.log(`[eval] Native Stockfish (${LOCAL_SERVER}): ✅ connected`);
  }
  return ok;
}

function rawToEvalResult(data: {
  cp?: number;
  mate?: number;
  depth?: number;
  bestMove?: string;
  pv?: string[];
  wdl?: { w: number; d: number; l: number };
}): EvalResult | null {
  if (!data?.depth || data.depth <= 0) return null;
  return {
    cp: data.cp,
    mate: data.mate,
    wdl: data.wdl,
    depth: data.depth,
    source: "local",
    bestMove: data.bestMove,
    pv: data.pv,
  };
}

type BatchRow = {
  fen?: string;
  cp?: number;
  mate?: number;
  depth?: number;
  bestMove?: string;
  pv?: string[];
  wdl?: { w: number; d: number; l: number };
  error?: string;
};

type BatchJobStatusPayload = {
  jobId?: string;
  status?: string;
  results?: BatchRow[];
  error?: string;
  queuePosition?: number;
  queueAhead?: number;
  etaMs?: number;
  estimatedMs?: number;
};

function applyBatchRows(
  out: Map<string, EvalResult>,
  chunk: string[],
  rows: BatchRow[]
) {
  for (let j = 0; j < chunk.length; j++) {
    const fen = chunk[j];
    const row = rows[j];
    if (!row || row.error) continue;
    const ev = rawToEvalResult(row);
    if (ev) out.set(fen, ev);
  }
}

async function runBatchChunkLegacy(chunk: string[], depth: number): Promise<BatchRow[]> {
  const res = await fetch(`${LOCAL_SERVER}/eval/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fens: chunk, depth }),
    signal: AbortSignal.timeout(BATCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`batch failed (${res.status})`);
  const data = await res.json();
  return (data?.results ?? []) as BatchRow[];
}

async function runBatchChunkQueued(
  chunk: string[],
  depth: number,
  queuePriority: number,
  chunkDone: number,
  chunkTotal: number
): Promise<BatchRow[]> {
  const submit = await fetch(`${LOCAL_SERVER}/eval/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fens: chunk, depth, async: true, queuePriority }),
    signal: AbortSignal.timeout(60_000),
    cache: "no-store",
  });
  if (!submit.ok) throw new Error(`batch submit failed (${submit.status})`);
  const first = await submit.json();
  if (!first?.jobId) throw new Error("batch queue unavailable");
  const jobId = String(first.jobId);

  let statusData = first;
  while (true) {
    const status = String(statusData?.status ?? "");
    if (status === "done") {
      emitQueueStatus({
        state: "idle",
        position: null,
        etaMs: null,
        chunkDone,
        chunkTotal,
      });
      return (statusData?.results ?? []) as BatchRow[];
    }
    if (status === "error") {
      throw new Error(statusData?.error || "batch queue failed");
    }
    emitQueueStatus({
      state: status === "queued" ? "queued" : "running",
      position:
        typeof statusData?.queuePosition === "number"
          ? statusData.queuePosition
          : null,
      etaMs: typeof statusData?.etaMs === "number" ? statusData.etaMs : null,
      chunkDone,
      chunkTotal,
    });
    await new Promise((r) => setTimeout(r, BATCH_QUEUE_POLL_MS));
    const poll = await fetch(`${LOCAL_SERVER}/eval/batch/${encodeURIComponent(jobId)}`, {
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    if (!poll.ok) throw new Error(`batch poll failed (${poll.status})`);
    statusData = await poll.json();
  }
}

/** Batch eval via laptop server — one HTTP round-trip per chunk (fast over tunnel). */
export async function evaluateFensBatch(
  fens: string[],
  depth = 16,
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, EvalResult>> {
  const out = new Map<string, EvalResult>();
  if (!LOCAL_SERVER || fens.length === 0) return out;

  const up = await ensureLocalServer();
  if (!up) return out;

  const unique = [...new Set(fens)];
  let done = 0;
  emitQueueStatus({
    state: "idle",
    position: null,
    etaMs: null,
    chunkDone: 0,
    chunkTotal: unique.length,
  });

  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += BATCH_CHUNK_SIZE) {
    chunks.push(unique.slice(i, i + BATCH_CHUNK_SIZE));
  }

  // Review-friendly scheduling: enqueue *all* chunk jobs for this batch stage
  // immediately, so concurrent reviews can't ping-pong chunk-by-chunk.
  const queuePriority = Date.now();

  const submitQueued = async (chunk: string[]): Promise<BatchJobStatusPayload> => {
    const submit = await fetch(`${LOCAL_SERVER}/eval/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fens: chunk,
        depth,
        async: true,
        queuePriority,
      }),
      signal: AbortSignal.timeout(60_000),
      cache: "no-store",
    });
    if (!submit.ok) throw new Error(`batch submit failed (${submit.status})`);
    return (await submit.json()) as BatchJobStatusPayload;
  };

  const pollJobUntilDone = async (
    jobId: string,
    chunkDone: number,
    chunkTotal: number,
    statusData: BatchJobStatusPayload
  ): Promise<BatchRow[]> => {
    let current = statusData;
    while (true) {
      const status = String(current?.status ?? "");
      if (status === "done") {
        emitQueueStatus({
          state: "idle",
          position: null,
          etaMs: null,
          chunkDone,
          chunkTotal,
        });
        return (current?.results ?? []) as BatchRow[];
      }
      if (status === "error") {
        throw new Error(current?.error || "batch queue failed");
      }
      emitQueueStatus({
        state: status === "queued" ? "queued" : "running",
        position: typeof current?.queuePosition === "number" ? current.queuePosition : null,
        etaMs: typeof current?.etaMs === "number" ? current.etaMs : null,
        chunkDone,
        chunkTotal,
      });
      await new Promise((r) => setTimeout(r, BATCH_QUEUE_POLL_MS));
      const poll = await fetch(`${LOCAL_SERVER}/eval/batch/${encodeURIComponent(jobId)}`, {
        signal: AbortSignal.timeout(30_000),
        cache: "no-store",
      });
      if (!poll.ok) throw new Error(`batch poll failed (${poll.status})`);
      current = (await poll.json()) as BatchJobStatusPayload;
    }
  };

  try {
    if (chunks.length === 0) return out;

    // Submit first chunk to detect whether async queue is supported.
    const firstChunk = chunks[0]!;
    const firstPayload = await submitQueued(firstChunk);
    const firstJobId = firstPayload?.jobId ? String(firstPayload.jobId) : null;
    if (!firstJobId) {
      throw new Error("batch queue unavailable");
    }

    const jobStatuses: Array<{ jobId: string; statusData: BatchJobStatusPayload }> = [
      { jobId: firstJobId, statusData: firstPayload },
    ];

    // Submit remaining chunks immediately to prevent chunk alternation.
    for (let ci = 1; ci < chunks.length; ci++) {
      const payload = await submitQueued(chunks[ci]!);
      const jobId = payload?.jobId ? String(payload.jobId) : null;
      if (!jobId) throw new Error("batch queue unavailable");
      jobStatuses.push({ jobId, statusData: payload });
    }

    // Poll jobs in chunk order, applying results as they complete.
    for (let ci = 0; ci < chunks.length; ci++) {
      const chunk = chunks[ci]!;
      const { jobId, statusData } = jobStatuses[ci]!;
      try {
        const rows = await pollJobUntilDone(jobId, done, unique.length, statusData);
        applyBatchRows(out, chunk, rows);
        done += chunk.length;
        onProgress?.(done, unique.length);
      } catch {
        probeState = "unknown";
        break;
      }
    }
  } catch {
    // Backward compatibility with older servers that only support blocking /eval/batch.
    out.clear();
    done = 0;
    for (const chunk of chunks) {
      try {
        const rows = await runBatchChunkLegacy(chunk, depth);
        applyBatchRows(out, chunk, rows);
        done += chunk.length;
        onProgress?.(done, unique.length);
      } catch {
        probeState = "unknown";
        break;
      }
    }
  }

  emitQueueStatus({
    state: "idle",
    position: null,
    etaMs: null,
    chunkDone: done,
    chunkTotal: unique.length,
  });
  nativeEngineExclusive = out.size > 0;
  return out;
}

export async function evalWithLocalServer(
  fen: string,
  depth = 16
): Promise<EvalResult | null> {
  if (!LOCAL_SERVER) return null;

  const up = await ensureLocalServer();
  if (!up) return null;

  try {
    const url = `${LOCAL_SERVER}/eval?fen=${encodeURIComponent(fen)}&depth=${depth}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(EVAL_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      probeState = "unknown";
      return null;
    }
    const data = await res.json();
    return rawToEvalResult(data);
  } catch {
    probeState = "unknown";
    return null;
  }
}

let workerInstance: Worker | null = null;
const pendingCallbacks = new Map<string, (result: EvalResult) => void>();
const pendingFens = new Map<string, string>();

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker(
      new URL("./stockfish.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerInstance.onmessage = (e) => {
      const { id, cp, mate, depth, bestMove, pv } = e.data;
      const cb = pendingCallbacks.get(id);
      const fen = pendingFens.get(id);
      if (cb && fen) {
        const norm = normalizeEvalToWhite(fen, cp, mate);
        cb({
          cp: norm.cp,
          mate: norm.mate,
          depth,
          source: "local",
          bestMove,
          pv,
        });
        pendingCallbacks.delete(id);
        pendingFens.delete(id);
      }
    };
  }
  return workerInstance;
}

let idCounter = 0;

function normalizeEvalToWhite(
  fen: string,
  cp?: number,
  mate?: number
): { cp?: number; mate?: number } {
  if (fen.split(" ")[1] !== "b") return { cp, mate };
  return {
    cp: cp !== undefined ? -cp : undefined,
    mate: mate !== undefined ? -mate : undefined,
  };
}

export async function evalWithStockfish(
  fen: string,
  depth = 14,
  timeoutMs = 20000
): Promise<EvalResult> {
  const worker = getWorker();
  const id = `sf_${++idCounter}`;

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingCallbacks.delete(id);
      pendingFens.delete(id);
      resolve({ cp: 0, depth: 0, source: "local" });
    }, timeoutMs);

    pendingFens.set(id, fen);
    pendingCallbacks.set(id, (result) => {
      clearTimeout(timer);
      resolve(result);
    });
    worker.postMessage({ id, fen, depth });
  });
}

const cloudCache = new Map<string, EvalResult>();
let lastCloudCall = 0;
const CLOUD_RATE_LIMIT_MS = import.meta.env.PROD ? 80 : 50;

async function fetchLichessCloudOnce(fen: string): Promise<EvalResult | null> {
  try {
    const url = `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.pvs?.length) return null;

    const pv = data.pvs[0];
    const result: EvalResult = {
      depth: data.depth ?? 20,
      source: "cloud",
      knodes: data.knodes,
    };

    if (pv.mate !== undefined) result.mate = pv.mate;
    else if (pv.cp !== undefined) result.cp = pv.cp;
    else return null;

    const moveList: string[] =
      typeof pv.moves === "string"
        ? pv.moves.trim().split(/\s+/).filter(Boolean)
        : Array.isArray(pv.moves)
          ? pv.moves
          : [];
    if (moveList.length > 0) {
      result.bestMove = moveList[0];
      result.pv = moveList.slice(0, 8);
    }

    cloudCache.set(fen, result);
    return result;
  } catch {
    return null;
  }
}

export async function evalWithLichessCloud(fen: string): Promise<EvalResult | null> {
  const cached = cloudCache.get(fen);
  if (cached) return cached;

  const now = Date.now();
  const wait = CLOUD_RATE_LIMIT_MS - (now - lastCloudCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCloudCall = Date.now();

  try {
    let result = await fetchLichessCloudOnce(fen);
    if (!result) {
      await new Promise((r) => setTimeout(r, 600));
      lastCloudCall = Date.now();
      result = await fetchLichessCloudOnce(fen);
    }
    return result;
  } catch {
    return null;
  }
}

export interface ConsensusEvalPolicy {
  requestedDepth: number;
  fastDepth: number;
  deepDepth: number;
  minVerifiedDepth: number;
  maxDeepPositions: number;
  disagreementCpForLowConfidence: number;
}

export interface ConsensusEvalMeta {
  evaluated: number;
  deepened: number;
  verified: number;
}

export interface ConsensusEvalOutput {
  evals: Map<string, EvalResult>;
  meta: ConsensusEvalMeta;
}

function cpFromEvalForDisagreement(e: EvalResult | undefined): number | null {
  if (!e) return null;
  if (e.mate !== undefined) return e.mate > 0 ? 10000 : -10000;
  if (e.cp === undefined) return null;
  return e.cp;
}

function prioritizeForDeepening(
  fens: string[],
  fastMap: Map<string, EvalResult>,
  policy: ConsensusEvalPolicy
): string[] {
  const scored = fens.map((fen) => {
    const ev = fastMap.get(fen);
    if (!ev) return { fen, score: 1_000_000 };
    const cpAbs = Math.abs(ev.cp ?? 0);
    const nearEqualityBoost = Math.max(0, 180 - cpAbs);
    const shallowPenalty = Math.max(0, policy.minVerifiedDepth - (ev.depth ?? 0)) * 120;
    const mateBoost = ev.mate !== undefined ? 200 : 0;
    return { fen, score: nearEqualityBoost + shallowPenalty + mateBoost };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored
    .slice(0, Math.min(policy.maxDeepPositions, scored.length))
    .map((x) => x.fen);
}

function mergeConsensusEval(
  fastEval: EvalResult | undefined,
  deepEval: EvalResult | undefined,
  policy: ConsensusEvalPolicy
): EvalResult {
  const base = deepEval ?? fastEval ?? { cp: 0, depth: 0, source: "local" as const };
  const fastCp = cpFromEvalForDisagreement(fastEval);
  const deepCp = cpFromEvalForDisagreement(deepEval);
  const disagreementCp =
    fastCp !== null && deepCp !== null ? Math.abs(fastCp - deepCp) : undefined;
  const depth = base.depth ?? 0;
  let verified = depth >= policy.minVerifiedDepth;
  let confidence = verified ? 0.9 : 0.45;
  let unverifiedReason: EvalResult["unverifiedReason"] | undefined;

  if (!verified) {
    unverifiedReason = "shallow_depth";
  }
  if (
    disagreementCp !== undefined &&
    disagreementCp > policy.disagreementCpForLowConfidence
  ) {
    verified = false;
    confidence = 0.35;
    unverifiedReason = "high_disagreement";
  }
  if (!fastEval && !deepEval) {
    verified = false;
    confidence = 0.2;
    unverifiedReason = "missing_eval";
  }

  return {
    ...base,
    targetDepth: policy.requestedDepth,
    verified,
    confidence,
    unverifiedReason,
    disagreementCp,
  };
}

export async function evaluateFensConsensus(
  fens: string[],
  policy: ConsensusEvalPolicy,
  onProgress?: (done: number, total: number) => void
): Promise<ConsensusEvalOutput> {
  const unique = [...new Set(fens)];
  const total = unique.length;
  const fastMap = await evaluateFensBatch(unique, policy.fastDepth, onProgress);
  if (fastMap.size < unique.length) {
    for (const fen of unique) {
      if (fastMap.has(fen)) continue;
      const fallback = await evaluateFen(fen, policy.fastDepth).catch(() => null);
      if (fallback) fastMap.set(fen, fallback);
    }
  }

  const deepenTargets = prioritizeForDeepening(unique, fastMap, policy);
  const deepMap = await evaluateFensBatch(deepenTargets, policy.deepDepth);
  if (deepMap.size < deepenTargets.length) {
    for (const fen of deepenTargets) {
      if (deepMap.has(fen)) continue;
      const fallback = await evaluateFen(fen, policy.deepDepth).catch(() => null);
      if (fallback) deepMap.set(fen, fallback);
    }
  }

  const merged = new Map<string, EvalResult>();
  let verified = 0;
  for (const fen of unique) {
    const finalEval = mergeConsensusEval(fastMap.get(fen), deepMap.get(fen), policy);
    if (finalEval.verified) verified++;
    merged.set(fen, finalEval);
  }

  return {
    evals: merged,
    meta: {
      evaluated: total,
      deepened: deepenTargets.length,
      verified,
    },
  };
}

export let cloudOnlyMode = false;

export function setCloudOnlyMode(val: boolean) {
  cloudOnlyMode = val;
}

/** Re-check native server (e.g. after tunnel reconnect) */
export async function refreshNativeEngineProbe(): Promise<boolean> {
  probeState = "unknown";
  lastProbeMs = 0;
  nativeEngineExclusive = false;
  return ensureLocalServer(true);
}

export async function evaluateFen(
  fen: string,
  localDepth = 16
): Promise<EvalResult> {
  const local = await evalWithLocalServer(fen, localDepth);
  if (local) return local;

  if (nativeEngineExclusive) {
    console.warn("[eval] Native server missed a position; falling back to cloud/browser");
    nativeEngineExclusive = false;
  }

  if (cloudOnlyMode && !import.meta.env.PROD) {
    return { cp: 0, depth: 0, source: "local" };
  }

  const cloud = await evalWithLichessCloud(fen);
  if (cloud) return cloud;

  const wasmDepth = import.meta.env.PROD ? Math.min(10, localDepth) : localDepth;
  const wasmTimeout = import.meta.env.PROD ? 8000 : 20000;
  return evalWithStockfish(fen, wasmDepth, wasmTimeout);
}

export function evalToCp(evalResult: EvalResult): number {
  if (evalResult.mate !== undefined) {
    return evalResult.mate > 0 ? 10000 : -10000;
  }
  return evalResult.cp ?? 0;
}

export function normalizeEval(cp: number): number {
  return (2 / (1 + Math.exp(-0.004 * cp)) - 1) * 100;
}

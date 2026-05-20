import type { EvalResult } from "../types";

// Native server: dev → localhost:8765 | production → VITE_EVAL_SERVER_URL (tunnel/VPS)
export const EVAL_SERVER_URL = (
  import.meta.env.VITE_EVAL_SERVER_URL as string | undefined
)?.replace(/\/$/, "") ?? (import.meta.env.DEV ? "http://127.0.0.1:8765" : "");

const LOCAL_SERVER = EVAL_SERVER_URL;
const HEALTH_TIMEOUT_MS = 8000;
const EVAL_TIMEOUT_MS = 45000;
const PROBE_UP_TTL_MS = 45_000;
const PROBE_DOWN_RETRY_MS = 6_000;

type ProbeState = "unknown" | "up" | "down";
let probeState: ProbeState = "unknown";
let lastProbeMs = 0;
/** When native server is up, skip Lichess/WASM for speed and full-game depth */
let nativeEngineExclusive = false;

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
    if (!data?.depth || data.depth <= 0) return null;
    return {
      cp: data.cp,
      mate: data.mate,
      depth: data.depth,
      source: "local",
      bestMove: data.bestMove,
      pv: data.pv,
    };
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

export function terminateWorker() {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
    pendingCallbacks.clear();
    pendingFens.clear();
  }
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

import type { EvalResult } from "../types";

// ─── Local native Stockfish server (fastest) ─────────────────────────────────
// Dev: node stockfish-server.mjs  |  Prod: set VITE_EVAL_SERVER_URL (optional)
const LOCAL_SERVER = (
  import.meta.env.VITE_EVAL_SERVER_URL as string | undefined
)?.replace(/\/$/, "") ?? (import.meta.env.DEV ? "http://127.0.0.1:8765" : "");
let localServerAvailable: boolean | null = null; // null = not yet probed (resets each page load)

async function probeLocalServer(): Promise<boolean> {
  try {
    const res = await fetch(
      `${LOCAL_SERVER}/eval?fen=rnbqkbnr%2Fpppppppp%2F8%2F8%2F8%2F8%2FPPPPPPPP%2FRNBQKBNR%20w%20KQkq%20-%200%201&depth=1`,
      { signal: AbortSignal.timeout(1500) }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function evalWithLocalServer(fen: string, depth = 18): Promise<EvalResult | null> {
  if (!LOCAL_SERVER) return null;
  if (localServerAvailable === null) {
    localServerAvailable = await probeLocalServer();
    console.log(`[eval] Local Stockfish server: ${localServerAvailable ? "✅ available" : "❌ not running"}`);
  }
  if (!localServerAvailable) return null;
  try {
    const url = `${LOCAL_SERVER}/eval?fen=${encodeURIComponent(fen)}&depth=${depth}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    const data = await res.json();
    return { cp: data.cp, mate: data.mate, depth: data.depth, source: "local", bestMove: data.bestMove, pv: data.pv };
  } catch {
    localServerAvailable = false; // server went away
    return null;
  }
}

let workerInstance: Worker | null = null;
let workerReady = false;
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
    workerReady = true;
  }
  return workerInstance;
}

export function terminateWorker() {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
    workerReady = false;
    pendingCallbacks.clear();
    pendingFens.clear();
  }
}

let idCounter = 0;

/** Stockfish scores are from side-to-move; normalize to White's perspective (like Lichess). */
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
const CLOUD_RATE_LIMIT_MS = import.meta.env.PROD ? 100 : 50;

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

    if (pv.mate !== undefined) {
      result.mate = pv.mate;
    } else if (pv.cp !== undefined) {
      result.cp = pv.cp;
    } else {
      return null;
    }

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

export async function evalWithLichessCloud(
  fen: string
): Promise<EvalResult | null> {
  const cached = cloudCache.get(fen);
  if (cached) return cached;

  const now = Date.now();
  const wait = CLOUD_RATE_LIMIT_MS - (now - lastCloudCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCloudCall = Date.now();

  try {
    let result = await fetchLichessCloudOnce(fen);
    if (!result) {
      await new Promise((r) => setTimeout(r, 800));
      lastCloudCall = Date.now();
      result = await fetchLichessCloudOnce(fen);
    }
    return result;
  } catch {
    return null;
  }
}

// When true: skip local Stockfish entirely (faster, like Chess.com's default review).
// Unknown positions return a neutral eval instead of waiting for local compute.
export let cloudOnlyMode = false;

export function setCloudOnlyMode(val: boolean) {
  cloudOnlyMode = val;
}

export async function evaluateFen(
  fen: string,
  localDepth = 16
): Promise<EvalResult> {
  // Priority: 1) native local server (fastest), 2) Lichess cloud, 3) WASM Stockfish
  const local = await evalWithLocalServer(fen, localDepth);
  if (local) return local;

  const cloud = await evalWithLichessCloud(fen);
  if (cloud) return cloud;

  // Local dev depth ≤12: skip WASM entirely
  if (cloudOnlyMode && !import.meta.env.PROD) {
    return { cp: 0, depth: 0, source: "local" };
  }

  // Production / misses: shallow browser engine so the full game gets classified
  const wasmDepth = import.meta.env.PROD
    ? Math.min(8, localDepth)
    : localDepth;
  const wasmTimeout = import.meta.env.PROD ? 5000 : 20000;
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

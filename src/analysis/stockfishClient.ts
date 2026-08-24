import type { EvalResult } from "../types";
import type { PositionAnalysis } from "./types";
import type { AnalyzeResponse } from "./stockfishReview.worker";
import { evalToCpWhite } from "./expectedPoints";

const DEFAULT_DEPTH = 18;
const DEFAULT_MULTIPV = 3;

let worker: Worker | null = null;
let multiPvConfigured = 0;
const pending = new Map<string, (r: AnalyzeResponse) => void>();
let idCounter = 0;

/**
 * A dead worker never replies, so every in-flight request would otherwise sit
 * until its own 120s timeout — and each subsequent position would repeat that
 * wait. Settle everything at once and drop the instance so the next call builds
 * a fresh worker.
 */
function failAllPending(reason: string): void {
  const inFlight = [...pending.entries()];
  pending.clear();
  multiPvConfigured = 0;
  try {
    worker?.terminate();
  } catch {
    /* already gone */
  }
  worker = null;

  if (inFlight.length > 0) {
    console.warn(`[stockfish] worker unavailable (${reason})`);
  }
  for (const [id, cb] of inFlight) {
    // Empty lines mean "not analysed"; callers already treat that as a gap
    // rather than a failure, so the review degrades instead of dying.
    cb({ id, depth: 0, lines: [] } as AnalyzeResponse);
  }
}

function getWorker(): Worker | null {
  if (worker) return worker;
  try {
    const created = new Worker(
      new URL("./stockfishReview.worker.ts", import.meta.url),
      { type: "module" }
    );
    created.onmessage = (e: MessageEvent<AnalyzeResponse>) => {
      const cb = pending.get(e.data.id);
      if (cb) {
        pending.delete(e.data.id);
        cb(e.data);
      }
    };
    created.onerror = () => failAllPending("runtime error");
    created.onmessageerror = () => failAllPending("message decode error");
    worker = created;
    return worker;
  } catch {
    // Workers unavailable (unsupported browser, blocked by policy).
    return null;
  }
}

function normalizeCpToWhite(fen: string, cp?: number, mate?: number): { cp?: number; mate?: number } {
  if (fen.split(" ")[1] !== "b") return { cp, mate };
  return {
    cp: cp !== undefined ? -cp : undefined,
    mate: mate !== undefined ? -mate : undefined,
  };
}

export async function analyzePositionMultiPv(
  fen: string,
  options?: {
    depth?: number;
    multiPv?: number;
    timeoutMs?: number;
    signal?: AbortSignal | null;
  }
): Promise<PositionAnalysis> {
  const depth = Math.max(options?.depth ?? DEFAULT_DEPTH, 18);
  const multiPv = options?.multiPv ?? DEFAULT_MULTIPV;
  const id = `sfrev_${++idCounter}`;
  const empty: PositionAnalysis = { fen, depth: 0, lines: [] };

  if (options?.signal?.aborted) return empty;

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      resolve(empty);
    }, options?.timeoutMs ?? 120_000);

    const onAbort = () => {
      clearTimeout(timer);
      pending.delete(id);
      resolve(empty);
    };
    options?.signal?.addEventListener("abort", onAbort, { once: true });

    pending.set(id, (response) => {
      clearTimeout(timer);
      options?.signal?.removeEventListener("abort", onAbort);
      const lines = response.lines.map((line) => {
        const norm = normalizeCpToWhite(fen, line.cp, line.mate);
        return {
          multipv: line.multipv,
          cp: norm.cp,
          mate: norm.mate,
          wdl: line.wdl,
          depth: line.depth,
          pv: line.pv,
          bestMove: line.bestMove ?? line.pv[0],
        };
      });
      resolve({ fen, depth: response.depth, lines });
    });

    const w = getWorker();
    if (!w) {
      clearTimeout(timer);
      pending.delete(id);
      resolve(empty);
      return;
    }

    try {
      if (multiPv !== multiPvConfigured) {
        w.postMessage(`setoption name MultiPV value ${multiPv}`);
        multiPvConfigured = multiPv;
      }
      w.postMessage({ id, fen, depth, multiPv });
    } catch {
      clearTimeout(timer);
      failAllPending("postMessage failed");
      resolve(empty);
    }
  });
}

export function positionAnalysisToEvalResult(
  analysis: PositionAnalysis,
  lineIndex = 0
): EvalResult {
  const line = analysis.lines[lineIndex];
  if (!line) {
    return { cp: 0, depth: 0, source: "local", verified: false, confidence: 0 };
  }
  return {
    cp: line.cp,
    mate: line.mate,
    wdl: line.wdl,
    depth: line.depth,
    source: "local",
    bestMove: line.bestMove,
    pv: line.pv,
    verified: line.depth >= 18,
    confidence: line.depth >= 18 ? 0.95 : 0.5,
  };
}

export function lineCpWhite(line: { cp?: number; mate?: number }): number {
  return evalToCpWhite(line);
}


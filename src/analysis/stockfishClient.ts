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

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL("./stockfishReview.worker.ts", import.meta.url),
      { type: "module" }
    );
    worker.onmessage = (e: MessageEvent<AnalyzeResponse>) => {
      const cb = pending.get(e.data.id);
      if (cb) {
        pending.delete(e.data.id);
        cb(e.data);
      }
    };
  }
  return worker;
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
  options?: { depth?: number; multiPv?: number; timeoutMs?: number }
): Promise<PositionAnalysis> {
  const depth = Math.max(options?.depth ?? DEFAULT_DEPTH, 18);
  const multiPv = options?.multiPv ?? DEFAULT_MULTIPV;
  const id = `sfrev_${++idCounter}`;

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      resolve({ fen, depth: 0, lines: [] });
    }, options?.timeoutMs ?? 120_000);

    pending.set(id, (response) => {
      clearTimeout(timer);
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
    if (multiPv !== multiPvConfigured) {
      w.postMessage(`setoption name MultiPV value ${multiPv}`);
      multiPvConfigured = multiPv;
    }
    w.postMessage({ id, fen, depth, multiPv });
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


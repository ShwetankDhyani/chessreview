/**
 * Stockfish WASM worker (public/stockfish.js) with MultiPV + WDL when available.
 */
declare function importScripts(...urls: string[]): void;

import { parseInfoLine } from "./uciParser";
import { wdlToWhitePerspective } from "./wdl";

export interface AnalyzeRequest {
  id: string;
  fen: string;
  depth: number;
  multiPv: number;
}

export interface PvLineOut {
  multipv: number;
  cp?: number;
  mate?: number;
  wdl?: { w: number; d: number; l: number };
  depth: number;
  pv: string[];
  bestMove?: string;
}

export interface AnalyzeResponse {
  id: string;
  depth: number;
  lines: PvLineOut[];
}

const queue = new Map<
  string,
  {
    resolve: (r: AnalyzeResponse) => void;
    depth: number;
    multiPv: number;
    fen: string;
  }
>();

let currentId: string | null = null;
let currentFen = "";
let currentMultiPv = 3;
let engineReady = false;
let loaded = false;
let sendToEngine: (cmd: string) => void = () => {};

const lineState = new Map<
  number,
  {
    cp?: number;
    mate?: number;
    wdl?: { w: number; d: number; l: number };
    depth: number;
    pv: string[];
  }
>();

function blackToMove(fen: string): boolean {
  return fen.split(" ")[1] === "b";
}

function resetLineState(multiPv: number) {
  lineState.clear();
  for (let i = 1; i <= multiPv; i++) {
    lineState.set(i, { depth: 0, pv: [] });
  }
}

function handleOutput(line: string) {
  if (line === "readyok") {
    engineReady = true;
    flush();
    return;
  }
  if (!currentId) return;

  if (line.startsWith("info")) {
    const parsed = parseInfoLine(line);
    if (!parsed || !line.includes(" multipv ")) return;

    const prev = lineState.get(parsed.multipv) ?? { depth: 0, pv: [] };
    if (parsed.depth >= prev.depth) {
      const next = { ...prev, depth: parsed.depth, pv: parsed.pv };
      if (parsed.scoreType === "cp" && parsed.scoreValue !== null) {
        next.cp = parsed.scoreValue;
        next.mate = undefined;
      } else if (parsed.scoreType === "mate" && parsed.scoreValue !== null) {
        next.mate = parsed.scoreValue;
        next.cp = undefined;
      }
      if (parsed.wdl) {
        next.wdl = wdlToWhitePerspective(
          parsed.wdl.w,
          parsed.wdl.d,
          parsed.wdl.l,
          blackToMove(currentFen)
        );
      }
      lineState.set(parsed.multipv, next);
    }
    return;
  }

  if (line.startsWith("bestmove")) {
    const req = queue.get(currentId);
    if (!req) return;

    const lines: PvLineOut[] = [];
    for (let mpv = 1; mpv <= req.multiPv; mpv++) {
      const st = lineState.get(mpv);
      if (!st) continue;
      lines.push({
        multipv: mpv,
        cp: st.cp,
        mate: st.mate,
        wdl: st.wdl,
        depth: st.depth,
        pv: st.pv,
        bestMove: st.pv[0],
      });
    }

    const bm = line.match(/^bestmove (\S+)/);
    if (lines[0] && bm?.[1]) lines[0].bestMove = bm[1];

    req.resolve({ id: currentId, depth: Math.max(...lines.map((l) => l.depth), 0), lines });
    queue.delete(currentId);
    currentId = null;
    resetLineState(currentMultiPv);
    flush();
  }
}

function flush() {
  if (currentId || !engineReady || queue.size === 0) return;
  const [id, req] = queue.entries().next().value as [
    string,
    { resolve: (r: AnalyzeResponse) => void; depth: number; multiPv: number; fen: string },
  ];
  currentId = id;
  currentFen = req.fen;
  currentMultiPv = req.multiPv;
  resetLineState(req.multiPv);
  sendToEngine(`setoption name MultiPV value ${req.multiPv}`);
  sendToEngine(`setoption name UCI_ShowWDL value true`);
  sendToEngine(`position fen ${req.fen}`);
  sendToEngine(`go depth ${req.depth}`);
}

function loadStockfish() {
  if (loaded) return;
  loaded = true;

  try {
    const origin = self.location?.origin ?? "";
    importScripts(`${origin}/stockfish.js`);
  } catch {
    for (const [id, req] of queue) {
      req.resolve({ id, depth: 0, lines: [] });
    }
    queue.clear();
    return;
  }

  sendToEngine = (cmd: string) => {
    (self as unknown as { postMessage: (s: string) => void }).postMessage(cmd);
  };

  (self as unknown as { onmessage: ((e: MessageEvent) => void) | null }).onmessage = (
    e: MessageEvent
  ) => {
    const data = e.data;
    if (typeof data === "string") {
      handleOutput(data);
    } else if (data && typeof data === "object" && "id" in data) {
      enqueue(data as AnalyzeRequest);
    }
  };

  sendToEngine("uci");
  sendToEngine("setoption name MultiPV value 3");
  sendToEngine("setoption name UCI_ShowWDL value true");
  sendToEngine("isready");
}

const mainPostMessage = self.postMessage.bind(self);

function enqueue(req: AnalyzeRequest) {
  const promise = new Promise<AnalyzeResponse>((resolve) => {
    queue.set(req.id, {
      resolve,
      depth: req.depth,
      multiPv: req.multiPv,
      fen: req.fen,
    });
  });
  promise.then((result) => mainPostMessage(result));
  if (engineReady) flush();
}

self.onmessage = (e: MessageEvent<AnalyzeRequest>) => {
  enqueue(e.data);
  loadStockfish();
};

export {};

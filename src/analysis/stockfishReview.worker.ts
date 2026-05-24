/**
 * Stockfish WASM worker (public/stockfish.js) with MultiPV support.
 * Upgrade binary to SF 16.1 by replacing /public/stockfish.js when available.
 */
declare function importScripts(...urls: string[]): void;

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
let currentMultiPv = 2;
let engineReady = false;
let loaded = false;
let sendToEngine: (cmd: string) => void = () => {};

const lineState = new Map<number, { cp?: number; mate?: number; depth: number; pv: string[] }>();

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

  if (line.startsWith("info") && line.includes(" depth ") && line.includes(" multipv ")) {
    const depthM = line.match(/\bdepth (\d+)/);
    const mpvM = line.match(/\bmultipv (\d+)/);
    const cpM = line.match(/\bscore cp (-?\d+)/);
    const mateM = line.match(/\bscore mate (-?\d+)/);
    const pvM = line.match(/\bpv (.+)$/);
    if (!depthM || !mpvM) return;

    const multipv = parseInt(mpvM[1], 10);
    const depth = parseInt(depthM[1], 10);
    const prev = lineState.get(multipv) ?? { depth: 0, pv: [] };
    if (depth >= prev.depth) {
      const next = { ...prev, depth };
      if (cpM) {
        next.cp = parseInt(cpM[1], 10);
        next.mate = undefined;
      } else if (mateM) {
        next.mate = parseInt(mateM[1], 10);
        next.cp = undefined;
      }
      if (pvM) next.pv = pvM[1].trim().split(/\s+/).slice(0, 12);
      lineState.set(multipv, next);
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
  currentMultiPv = req.multiPv;
  resetLineState(req.multiPv);
  sendToEngine(`setoption name MultiPV value ${req.multiPv}`);
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
  sendToEngine("setoption name MultiPV value 2");
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

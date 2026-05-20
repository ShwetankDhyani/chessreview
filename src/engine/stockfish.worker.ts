// importScripts is available in all browser Workers but not declared in DOM lib
declare function importScripts(...urls: string[]): void;

// stockfish.js (v10) loads into this worker's global scope via importScripts.
// Once loaded it hijacks self.onmessage / self.postMessage for UCI I/O.
// We wrap that by storing a reference to the original postMessage before load,
// then after load we intercept self.onmessage to read engine output.

interface EvalRequest {
  id: string;
  fen: string;
  depth: number;
}

interface EvalResponse {
  id: string;
  cp?: number;
  mate?: number;
  depth: number;
}

const queue = new Map<
  string,
  { resolve: (r: EvalResponse) => void; depth: number; fen: string }
>();

let currentId: string | null = null;
let bestCp: number | undefined;
let bestMate: number | undefined;
let bestDepth = 0;
let engineReady = false;
let loaded = false;

// sendToEngine posts a UCI command string to stockfish running in this scope
let sendToEngine: (cmd: string) => void = () => {};

function handleOutput(line: string) {
  if (line === "readyok") {
    engineReady = true;
    flush();
    return;
  }

  if (!currentId) return;

  if (line.startsWith("info") && line.includes("depth")) {
    const d = line.match(/depth (\d+)/);
    const cp = line.match(/score cp (-?\d+)/);
    const mate = line.match(/score mate (-?\d+)/);
    const depth = d ? parseInt(d[1]) : 0;
    if (depth >= bestDepth) {
      bestDepth = depth;
      if (cp) { bestCp = parseInt(cp[1]); bestMate = undefined; }
      else if (mate) { bestMate = parseInt(mate[1]); bestCp = undefined; }
    }
  }

  if (line.startsWith("bestmove")) {
    const req = queue.get(currentId);
    if (req) {
      const res: EvalResponse = { id: currentId, depth: bestDepth };
      if (bestMate !== undefined) res.mate = bestMate;
      else res.cp = bestCp ?? 0;
      req.resolve(res);
      queue.delete(currentId);
    }
    currentId = null;
    bestCp = undefined;
    bestMate = undefined;
    bestDepth = 0;
    flush();
  }
}

function flush() {
  if (currentId || !engineReady || queue.size === 0) return;
  const [id, req] = queue.entries().next().value as [string, { resolve: (r: EvalResponse) => void; depth: number; fen: string }];
  currentId = id;
  sendToEngine(`position fen ${req.fen}`);
  sendToEngine(`go depth ${req.depth}`);
}

function loadStockfish() {
  if (loaded) return;
  loaded = true;

  try {
    importScripts("https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js");
  } catch {
    // CDN blocked — resolve all queued requests with fallback zero eval
    for (const [id, req] of queue) {
      req.resolve({ id, cp: 0, depth: 0 });
    }
    queue.clear();
    return;
  }

  // After importScripts, stockfish has replaced self.postMessage with its output pipe.
  // Its output comes through self.onmessage (it calls the original postMessage).
  // We send commands by calling the stockfish-installed postMessage.
  sendToEngine = (cmd: string) => {
    (self as unknown as { postMessage: (s: string) => void }).postMessage(cmd);
  };

  // Intercept engine output — stockfish calls the outer worker's original postMessage
  // which routes through the main thread's onmessage. We override self.onmessage here.
  (self as unknown as { onmessage: ((e: MessageEvent) => void) | null }).onmessage = (e: MessageEvent) => {
    const data = e.data;
    if (typeof data === "string") {
      handleOutput(data);
    } else if (data && typeof data === "object" && "id" in data) {
      // It's a new eval request from the main thread arriving after load
      const { id, fen, depth } = data as EvalRequest;
      enqueue(id, fen, depth);
    }
  };

  sendToEngine("uci");
  sendToEngine("isready");
}

function enqueue(id: string, fen: string, depth: number) {
  const promise = new Promise<EvalResponse>((resolve) => {
    queue.set(id, { resolve, depth, fen });
  });
  promise.then((result) => {
    // Post result back to main thread using the raw worker postMessage
    // stockfish has replaced self.postMessage, so use a stored reference
    mainPostMessage(result);
  });
  if (engineReady) flush();
}

// Save the original postMessage before stockfish overwrites it
const mainPostMessage = self.postMessage.bind(self);

// Initial message handler (before stockfish loads)
self.onmessage = (e: MessageEvent<EvalRequest>) => {
  const { id, fen, depth } = e.data;
  enqueue(id, fen, depth);
  loadStockfish();
};

export {};

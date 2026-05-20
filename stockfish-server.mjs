/**
 * Local Stockfish evaluation server.
 * Spawns native Stockfish, exposes a simple HTTP API on port 8765.
 * The chess-review frontend calls this when available, falling back to Lichess cloud.
 *
 * GET /eval?fen=<FEN>&depth=<N>
 * Response: { cp?: number, mate?: number, depth: number }
 *
 * Start: node stockfish-server.mjs
 */

import { createServer } from "http";
import { spawn } from "child_process";
import { URL } from "url";

const PORT = 8765;
const STOCKFISH_PATH = "/usr/bin/stockfish";
const THREADS = 4; // use 4 of your 12 logical cores (leave headroom for browser)
const HASH_MB = 256;

// ─── Spawn Stockfish ──────────────────────────────────────────────────────────
const sf = spawn(STOCKFISH_PATH, [], { stdio: ["pipe", "pipe", "pipe"] });
sf.on("error", (e) => { console.error("Failed to start Stockfish:", e.message); process.exit(1); });

let outputBuf = "";
// Single active line handler — only one eval runs at a time via the queue
let lineHandler = null;

sf.stdout.on("data", (data) => {
  outputBuf += data.toString();
  const lines = outputBuf.split("\n");
  outputBuf = lines.pop() ?? "";
  for (const line of lines) {
    if (lineHandler) lineHandler(line.trim());
  }
});

function send(cmd) {
  sf.stdin.write(cmd + "\n");
}

function waitForLine(predicate, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      lineHandler = null;
      reject(new Error("Stockfish timeout"));
    }, timeoutMs);
    lineHandler = (line) => {
      if (predicate(line)) {
        clearTimeout(timer);
        lineHandler = null;
        resolve(line);
      }
    };
  });
}

// ─── Initialize ───────────────────────────────────────────────────────────────
let ready = false;

async function init() {
  send("uci");
  await waitForLine((l) => l === "uciok");
  send(`setoption name Threads value ${THREADS}`);
  send(`setoption name Hash value ${HASH_MB}`);
  send("ucinewgame");
  send("isready");
  await waitForLine((l) => l === "readyok");
  ready = true;
  console.log(`Stockfish ready (${THREADS} threads, ${HASH_MB}MB hash)`);
}

// ─── Eval queue (strictly sequential — one position at a time) ────────────────
let evalQueue = Promise.resolve();

function evaluate(fen, depth = 18) {
  // Chain: next eval only starts after previous resolves
  return (evalQueue = evalQueue.then(() => _evaluate(fen, depth)).catch((e) => {
    console.error("Eval error:", e.message);
    return { cp: 0, mate: undefined, depth: 0 };
  }));
}

async function _evaluate(fen, depth) {
  if (!ready) throw new Error("engine not ready");

  let bestCp, bestMate, bestDepth = 0, bestPv = [];

  send(`position fen ${fen}`);
  send(`go depth ${depth}`);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      lineHandler = null;
      send("stop");
      resolve({ cp: bestCp ?? 0, mate: bestMate, depth: bestDepth, pv: bestPv });
    }, 12000);

    lineHandler = (line) => {
      if (line.startsWith("info") && line.includes("depth") && !line.includes("currmove")) {
        const d = line.match(/depth (\d+)/);
        const cp = line.match(/score cp (-?\d+)/);
        const mate = line.match(/score mate (-?\d+)/);
        const pvMatch = line.match(/ pv (.+)$/);
        const curDepth = d ? parseInt(d[1]) : 0;
        if (curDepth >= bestDepth) {
          bestDepth = curDepth;
          if (cp)      { bestCp = parseInt(cp[1]); bestMate = undefined; }
          if (mate)    { bestMate = parseInt(mate[1]); bestCp = undefined; }
          if (pvMatch) { bestPv = pvMatch[1].trim().split(" ").slice(0, 8); }
        }
      }
      if (line.startsWith("bestmove")) {
        clearTimeout(timer);
        lineHandler = null;
        const bmMatch = line.match(/^bestmove (\S+)/);
        const bestMove = bmMatch ? bmMatch[1] : undefined;
        resolve({ cp: bestCp, mate: bestMate, depth: bestDepth, pv: bestPv, bestMove });
      }
    };
  });
}

// ─── FEN side-to-move helper ──────────────────────────────────────────────────
// FEN field 2 is the active color: 'w' or 'b'
function isBlackToMove(fen) {
  return fen.split(" ")[1] === "b";
}

// ─── HTTP server ──────────────────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  // CORS for localhost frontend
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== "/eval") {
    res.writeHead(404); res.end(JSON.stringify({ error: "not found" })); return;
  }

  const fen = url.searchParams.get("fen");
  const depth = Math.min(parseInt(url.searchParams.get("depth") ?? "18"), 25);

  if (!fen) {
    res.writeHead(400); res.end(JSON.stringify({ error: "fen required" })); return;
  }

  try {
    const result = await evaluate(fen, depth);

    // Stockfish cp is always from the side-to-move's perspective.
    // Normalize to White's perspective (same as Lichess) so the frontend
    // can treat both sources identically.
    let cp = result.cp;
    let mate = result.mate;
    if (isBlackToMove(fen)) {
      if (cp !== undefined)   cp   = -cp;
      if (mate !== undefined) mate = -mate;
    }

    res.writeHead(200);
    res.end(JSON.stringify({ cp, mate, depth: result.depth, bestMove: result.bestMove, pv: result.pv, source: "local-native" }));
  } catch (e) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Chess eval server listening on http://127.0.0.1:${PORT}`);
  console.log(`Test: curl "http://127.0.0.1:${PORT}/eval?fen=rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR%20b%20KQkq%20e3%200%201"`);
});

init().catch((e) => { console.error("Init failed:", e); process.exit(1); });

process.on("exit", () => sf.kill());
process.on("SIGINT", () => { sf.kill(); process.exit(0); });

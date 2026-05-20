/**
 * Native Stockfish HTTP eval server (Fedora: /usr/bin/stockfish).
 *
 *   node stockfish-server.mjs
 *   STOCKFISH_BIND=0.0.0.0 node stockfish-server.mjs   # allow tunnel/LAN
 *
 * GET /health  → { ok, engine, port }
 * GET /eval?fen=<FEN>&depth=<N>
 */

import { createServer } from "http";
import { spawn } from "child_process";
import { accessSync, constants } from "fs";
import { URL } from "url";

const PORT = parseInt(process.env.STOCKFISH_PORT ?? "8765", 10);
const BIND = process.env.STOCKFISH_BIND ?? "127.0.0.1";
const THREADS = parseInt(process.env.STOCKFISH_THREADS ?? "4", 10);
const HASH_MB = parseInt(process.env.STOCKFISH_HASH_MB ?? "256", 10);
const EVAL_TIMEOUT_MS = parseInt(process.env.STOCKFISH_EVAL_TIMEOUT_MS ?? "25000", 10);

const CANDIDATE_PATHS = [
  process.env.STOCKFISH_PATH,
  "/usr/bin/stockfish",
  "/usr/local/bin/stockfish",
].filter(Boolean);

function resolveStockfishPath() {
  for (const p of CANDIDATE_PATHS) {
    try {
      accessSync(p, constants.X_OK);
      return p;
    } catch {
      /* try next */
    }
  }
  console.error("Stockfish not found. Set STOCKFISH_PATH=/path/to/stockfish");
  process.exit(1);
}

const STOCKFISH_PATH = resolveStockfishPath();

const sf = spawn(STOCKFISH_PATH, [], { stdio: ["pipe", "pipe", "pipe"] });
sf.on("error", (e) => {
  console.error("Failed to start Stockfish:", e.message);
  process.exit(1);
});

let outputBuf = "";
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

function waitForLine(predicate, timeoutMs = 15000) {
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
  console.log(`Stockfish: ${STOCKFISH_PATH}`);
  console.log(`Threads: ${THREADS}, Hash: ${HASH_MB}MB`);
}

let evalQueue = Promise.resolve();

function evaluate(fen, depth = 16) {
  return (evalQueue = evalQueue
    .then(() => _evaluate(fen, depth))
    .catch((e) => {
      console.error("Eval error:", e.message);
      return { cp: 0, mate: undefined, depth: 0 };
    }));
}

async function _evaluate(fen, depth) {
  if (!ready) throw new Error("engine not ready");

  let bestCp, bestMate, bestDepth = 0, bestPv = [];

  send(`position fen ${fen}`);
  send(`go depth ${depth}`);

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      lineHandler = null;
      send("stop");
      const bm = bestPv[0];
      resolve({
        cp: bestCp,
        mate: bestMate,
        depth: bestDepth,
        pv: bestPv,
        bestMove: bm,
      });
    }, EVAL_TIMEOUT_MS);

    lineHandler = (line) => {
      if (line.startsWith("info") && line.includes("depth") && !line.includes("currmove")) {
        const d = line.match(/depth (\d+)/);
        const cp = line.match(/score cp (-?\d+)/);
        const mate = line.match(/score mate (-?\d+)/);
        const pvMatch = line.match(/ pv (.+)$/);
        const curDepth = d ? parseInt(d[1]) : 0;
        if (curDepth >= bestDepth) {
          bestDepth = curDepth;
          if (cp) {
            bestCp = parseInt(cp[1]);
            bestMate = undefined;
          }
          if (mate) {
            bestMate = parseInt(mate[1]);
            bestCp = undefined;
          }
          if (pvMatch) bestPv = pvMatch[1].trim().split(/\s+/).slice(0, 8);
        }
      }
      if (line.startsWith("bestmove")) {
        clearTimeout(timer);
        lineHandler = null;
        const bmMatch = line.match(/^bestmove (\S+)/);
        resolve({
          cp: bestCp,
          mate: bestMate,
          depth: bestDepth,
          pv: bestPv,
          bestMove: bmMatch?.[1] ?? bestPv[0],
        });
      }
    };
  });
}

function isBlackToMove(fen) {
  return fen.split(" ")[1] === "b";
}

const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${BIND}:${PORT}`);

  if (url.pathname === "/health") {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: ready, engine: STOCKFISH_PATH, port: PORT }));
    return;
  }

  if (url.pathname !== "/eval") {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "not found" }));
    return;
  }

  const fen = url.searchParams.get("fen");
  const depth = Math.min(parseInt(url.searchParams.get("depth") ?? "16", 10), 25);

  if (!fen) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: "fen required" }));
    return;
  }

  try {
    const result = await evaluate(fen, depth);
    let cp = result.cp;
    let mate = result.mate;
    if (isBlackToMove(fen)) {
      if (cp !== undefined) cp = -cp;
      if (mate !== undefined) mate = -mate;
    }
    res.writeHead(200);
    res.end(
      JSON.stringify({
        cp,
        mate,
        depth: result.depth,
        bestMove: result.bestMove,
        pv: result.pv,
        source: "local-native",
      })
    );
  } catch (e) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: e.message }));
  }
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the old server:`);
    console.error(`  fuser -k ${PORT}/tcp   # or:  pkill -f stockfish-server.mjs`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, BIND, () => {
  console.log(`Eval server http://${BIND}:${PORT}`);
  console.log(`Health:  http://${BIND === "0.0.0.0" ? "127.0.0.1" : BIND}:${PORT}/health`);
  if (BIND === "127.0.0.1") {
    console.log("For Vercel/tunnel: npm run eval-server:public");
  }
});

init().catch((e) => {
  console.error("Init failed:", e);
  process.exit(1);
});

process.on("exit", () => sf.kill());
process.on("SIGINT", () => {
  sf.kill();
  process.exit(0);
});

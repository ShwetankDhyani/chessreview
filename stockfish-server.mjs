/**
 * Native Stockfish HTTP eval server (laptop / Fedora).
 *
 *   node stockfish-server.mjs
 *   STOCKFISH_BIND=0.0.0.0 node stockfish-server.mjs   # tunnel / Vercel
 *
 * GET  /health
 * GET  /eval?fen=<FEN>&depth=<N>
 * POST /eval/batch  { "fens": ["..."], "depth": 16 }
 */

import { createServer } from "http";
import { spawn } from "child_process";
import { accessSync, constants, existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { URL } from "url";
import os from "os";
import { handleEngineStatsRequest } from "./server/reviewStatsFile.mjs";
import {
  geoFromHeaders,
  normalizeReviewPayload,
} from "./server/reviewStats.mjs";

/** Load .env from cwd (npm run does not source it automatically). */
function loadEnvFile() {
  const path = join(process.cwd(), ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadEnvFile();

const PORT = parseInt(process.env.STOCKFISH_PORT ?? "8765", 10);
const BIND = process.env.STOCKFISH_BIND ?? "127.0.0.1";
const CPU_COUNT = os.cpus().length;
const RAM_GB = os.totalmem() / 1024 ** 3;
const DEDICATED =
  process.env.STOCKFISH_DEDICATED === "1" ||
  process.env.STOCKFISH_DEDICATED === "true";
const LAPTOP_MODE = !DEDICATED && process.env.STOCKFISH_LAPTOP_MODE !== "0";

function autoThreads() {
  // i5 8th gen class: 4 cores — leave headroom for Node + cloudflared + GNOME
  if (DEDICATED) {
    return Math.max(2, Math.min(3, CPU_COUNT - 2));
  }
  if (LAPTOP_MODE || RAM_GB < 8) {
    return Math.max(1, Math.min(2, Math.floor(CPU_COUNT / 2)));
  }
  return Math.max(1, Math.min(CPU_COUNT - 1, 12));
}

function autoHashMb() {
  if (DEDICATED && RAM_GB >= 6) return 384;
  if (RAM_GB < 4) return 64;
  if (RAM_GB < 8) return 128;
  if (LAPTOP_MODE) return 256;
  return Math.min(1024, Math.max(256, Math.floor(RAM_GB * 128)));
}

const THREADS = parseInt(process.env.STOCKFISH_THREADS ?? String(autoThreads()), 10);
const HASH_MB = parseInt(process.env.STOCKFISH_HASH_MB ?? String(autoHashMb()), 10);
const EVAL_TIMEOUT_MS = parseInt(process.env.STOCKFISH_EVAL_TIMEOUT_MS ?? "45000", 10);
const MAX_BATCH = parseInt(process.env.STOCKFISH_MAX_BATCH ?? "128", 10);
const CACHE_MAX = parseInt(process.env.STOCKFISH_CACHE_SIZE ?? "8192", 10);
const MOVETIME_MS = parseInt(process.env.STOCKFISH_MOVETIME_MS ?? "0", 10);

const CANDIDATE_PATHS = [
  process.env.STOCKFISH_PATH,
  join(homedir(), ".local/bin/stockfish"),
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
  send("setoption name MultiPV value 1");
  send("ucinewgame");
  send("isready");
  await waitForLine((l) => l === "readyok");
  ready = true;
  console.log(`Stockfish: ${STOCKFISH_PATH}`);
  console.log(
    `Threads: ${THREADS}, Hash: ${HASH_MB}MB, timeout: ${EVAL_TIMEOUT_MS}ms` +
      (DEDICATED ? " (dedicated server)" : LAPTOP_MODE ? " (laptop mode)" : "") +
      (MOVETIME_MS > 0 ? `, movetime: ${MOVETIME_MS}ms` : "")
  );
  console.log(`RAM: ~${Math.floor(RAM_GB)}GB, CPUs: ${CPU_COUNT}, cache entries: ${CACHE_MAX}`);
}

/** LRU-ish: delete oldest entry when full */
const evalCache = new Map();
let cacheHits = 0;
let cacheMisses = 0;

function cacheKey(fen, depth) {
  return `${depth}:${fen}`;
}

function getCached(fen, depth) {
  const k = cacheKey(fen, depth);
  if (!evalCache.has(k)) return null;
  const v = evalCache.get(k);
  evalCache.delete(k);
  evalCache.set(k, v);
  cacheHits++;
  return v;
}

function setCached(fen, depth, result) {
  const k = cacheKey(fen, depth);
  if (evalCache.size >= CACHE_MAX) {
    const first = evalCache.keys().next().value;
    evalCache.delete(first);
  }
  evalCache.set(k, result);
}

let evalQueue = Promise.resolve();

function evaluate(fen, depth = 16) {
  const cached = getCached(fen, depth);
  if (cached) return Promise.resolve(cached);

  return (evalQueue = evalQueue
    .then(async () => {
      const hit = getCached(fen, depth);
      if (hit) return hit;
      cacheMisses++;
      const result = await _evaluate(fen, depth);
      setCached(fen, depth, result);
      return result;
    })
    .catch((e) => {
      console.error("Eval error:", e.message);
      return { cp: 0, mate: undefined, depth: 0 };
    }));
}

async function _evaluate(fen, depth) {
  if (!ready) throw new Error("engine not ready");

  let bestCp, bestMate, bestDepth = 0, bestPv = [];

  send(`position fen ${fen}`);
  if (MOVETIME_MS > 0) {
    send(`go movetime ${MOVETIME_MS}`);
  } else {
    send(`go depth ${depth}`);
  }

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

function flipForWhite(fen, result) {
  let cp = result.cp;
  let mate = result.mate;
  if (isBlackToMove(fen)) {
    if (cp !== undefined) cp = -cp;
    if (mate !== undefined) mate = -mate;
  }
  return {
    cp,
    mate,
    depth: result.depth,
    bestMove: result.bestMove,
    pv: result.pv,
    source: "local-native",
  };
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Admin-Key"
  );
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${BIND}:${PORT}`);
  const adminSecret = (
    process.env.ADMIN_SECRET ??
    process.env.STATS_READ_KEY ??
    ""
  ).trim();

  if (
    handleEngineStatsRequest(req, res, url, {
      adminSecret,
      readJsonBody,
      geoFromHeaders,
      normalizeReviewPayload,
    })
  ) {
    return;
  }

  if (url.pathname === "/health") {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        ok: ready,
        engine: STOCKFISH_PATH,
        port: PORT,
        threads: THREADS,
        hashMb: HASH_MB,
        cacheHits,
        cacheMisses,
        dedicated: DEDICATED,
        laptopMode: LAPTOP_MODE,
        ramGb: Math.floor(RAM_GB),
        maxBatch: MAX_BATCH,
        movetimeMs: MOVETIME_MS > 0 ? MOVETIME_MS : null,
        adminConfigured: adminSecret.length > 0,
      })
    );
    return;
  }

  if (url.pathname === "/eval/batch" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const fens = Array.isArray(body.fens) ? body.fens : [];
      const depth = Math.min(parseInt(body.depth ?? "16", 10), 25);
      if (fens.length === 0) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "fens array required" }));
        return;
      }
      if (fens.length > MAX_BATCH) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: `max ${MAX_BATCH} fens per batch` }));
        return;
      }
      const results = [];
      for (const fen of fens) {
        if (typeof fen !== "string" || !fen) {
          results.push({ error: "invalid fen" });
          continue;
        }
        const raw = await evaluate(fen, depth);
        results.push({ fen, ...flipForWhite(fen, raw) });
      }
      res.writeHead(200);
      res.end(JSON.stringify({ depth, results, source: "local-native" }));
    } catch (e) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: e.message }));
    }
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
    res.writeHead(200);
    res.end(JSON.stringify(flipForWhite(fen, result)));
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
    console.log("For Vercel/tunnel: npm run laptop:server");
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

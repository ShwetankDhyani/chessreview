/**
 * Native Stockfish HTTP eval server (laptop / Fedora / Oracle).
 *
 *   node stockfish-server.mjs
 *   STOCKFISH_BIND=0.0.0.0 node stockfish-server.mjs   # tunnel / Vercel
 *
 * GET  /health
 * GET  /eval?fen=<FEN>&depth=<N>
 * POST /eval/batch  { "fens": ["..."], "depth": 16 }
 *
 * Parallelism: STOCKFISH_WORKERS processes × STOCKFISH_THREADS each.
 * Batch requests fan out across workers (one FEN at a time per worker).
 */

import { createServer } from "http";
import { spawn } from "child_process";
import { accessSync, constants, existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { URL } from "url";
import os from "os";
import { handleEngineStatsRequest } from "./server/reviewStatsFile.mjs";
import { handleEngineShareRequest } from "./server/reviewShares.mjs";
import { handleEngineSavedReviewsRequest } from "./server/reviewSaves.mjs";
import { handleEngineAboutCommentsRequest } from "./server/aboutComments.mjs";
import { handleEngineBlogRequest } from "./server/blog.mjs";
import { handleEngineSiteSettingsRequest } from "./server/siteSettings.mjs";
import {
  geoFromHeaders,
  normalizeReviewPayload,
} from "./server/reviewStats.mjs";

/** Keys always re-read from .env so systemd does not mangle `$` in passwords. */
const DOTENV_OVERRIDE = new Set([
  "ADMIN_SECRET",
  "STATS_READ_KEY",
  "STATS_REVIEWS_BASELINE",
]);

function unquoteEnv(val) {
  let v = val.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

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
    const val = unquoteEnv(trimmed.slice(eq + 1));
    if (DOTENV_OVERRIDE.has(key) || process.env[key] === undefined) {
      process.env[key] = val;
    }
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

function autoWorkers() {
  // Parallel FEN evals beat oversubscribing one engine with many threads.
  if (DEDICATED) return Math.max(1, Math.min(3, CPU_COUNT - 1));
  if (LAPTOP_MODE || RAM_GB < 8) return 1;
  return Math.max(1, Math.min(2, Math.floor(CPU_COUNT / 2)));
}

function autoThreadsPerWorker(workers) {
  if (DEDICATED) {
    return Math.max(1, Math.min(2, Math.floor(CPU_COUNT / workers)));
  }
  if (LAPTOP_MODE || RAM_GB < 8) {
    return Math.max(1, Math.min(2, Math.floor(CPU_COUNT / 2)));
  }
  return Math.max(1, Math.min(4, Math.floor(CPU_COUNT / workers)));
}

function autoHashMbPerWorker(workers) {
  if (DEDICATED && RAM_GB >= 16) {
    return Math.min(1024, Math.max(256, Math.floor((RAM_GB * 64) / workers)));
  }
  if (DEDICATED && RAM_GB >= 6) return Math.max(128, Math.floor(384 / workers));
  if (RAM_GB < 4) return 64;
  if (RAM_GB < 8) return 128;
  if (LAPTOP_MODE) return Math.max(128, Math.floor(256 / workers));
  return Math.min(512, Math.max(128, Math.floor((RAM_GB * 64) / workers)));
}

const workersExplicit = process.env.STOCKFISH_WORKERS != null;
const threadsExplicit = process.env.STOCKFISH_THREADS != null;
// If only THREADS is set (legacy .env), keep 1 worker so we don't oversubscribe.
const WORKERS = Math.max(
  1,
  parseInt(
    process.env.STOCKFISH_WORKERS ??
      String(threadsExplicit && !workersExplicit ? 1 : autoWorkers()),
    10
  ) || 1
);
const THREADS = parseInt(
  process.env.STOCKFISH_THREADS ?? String(autoThreadsPerWorker(WORKERS)),
  10
);
const HASH_MB = parseInt(
  process.env.STOCKFISH_HASH_MB ?? String(autoHashMbPerWorker(WORKERS)),
  10
);
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

if (WORKERS * THREADS > CPU_COUNT) {
  console.warn(
    `Warning: ${WORKERS} workers × ${THREADS} threads = ${WORKERS * THREADS} ` +
      `exceeds ${CPU_COUNT} CPUs (oversubscribe). Consider STOCKFISH_WORKERS=2 STOCKFISH_THREADS=2.`
  );
}

/** LRU-ish shared result cache across workers */
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

class StockfishEngine {
  constructor(id) {
    this.id = id;
    this.sf = spawn(STOCKFISH_PATH, [], { stdio: ["pipe", "pipe", "pipe"] });
    this.outputBuf = "";
    this.lineHandler = null;
    this.ready = false;
    this.queue = Promise.resolve();

    this.sf.on("error", (e) => {
      console.error(`Stockfish worker #${id} failed:`, e.message);
    });
    this.sf.stdout.on("data", (data) => {
      this.outputBuf += data.toString();
      const lines = this.outputBuf.split("\n");
      this.outputBuf = lines.pop() ?? "";
      for (const line of lines) {
        if (this.lineHandler) this.lineHandler(line.trim());
      }
    });
  }

  send(cmd) {
    this.sf.stdin.write(cmd + "\n");
  }

  waitForLine(predicate, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.lineHandler = null;
        reject(new Error(`Stockfish worker #${this.id} timeout`));
      }, timeoutMs);
      this.lineHandler = (line) => {
        if (predicate(line)) {
          clearTimeout(timer);
          this.lineHandler = null;
          resolve(line);
        }
      };
    });
  }

  async init() {
    this.send("uci");
    await this.waitForLine((l) => l === "uciok");
    this.send(`setoption name Threads value ${THREADS}`);
    this.send(`setoption name Hash value ${HASH_MB}`);
    this.send("setoption name MultiPV value 1");
    this.send("setoption name UCI_ShowWDL value true");
    this.send("ucinewgame");
    this.send("isready");
    await this.waitForLine((l) => l === "readyok");
    this.ready = true;
  }

  evaluate(fen, depth = 16) {
    return (this.queue = this.queue
      .then(async () => {
        const hit = getCached(fen, depth);
        if (hit) return hit;
        cacheMisses++;
        const result = await this._evaluate(fen, depth);
        setCached(fen, depth, result);
        return result;
      })
      .catch((e) => {
        console.error(`Eval error (worker #${this.id}):`, e.message);
        return { cp: 0, mate: undefined, depth: 0 };
      }));
  }

  async _evaluate(fen, depth) {
    if (!this.ready) throw new Error(`engine #${this.id} not ready`);

    let bestCp;
    let bestMate;
    let bestDepth = 0;
    let bestPv = [];
    let bestWdl = null;

    this.send(`position fen ${fen}`);
    if (MOVETIME_MS > 0) {
      this.send(`go movetime ${MOVETIME_MS}`);
    } else {
      this.send(`go depth ${depth}`);
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.lineHandler = null;
        this.send("stop");
        const bm = bestPv[0];
        resolve({
          cp: bestCp,
          mate: bestMate,
          depth: bestDepth,
          pv: bestPv,
          bestMove: bm,
          wdl: bestWdl,
        });
      }, EVAL_TIMEOUT_MS);

      this.lineHandler = (line) => {
        if (
          line.startsWith("info") &&
          line.includes("depth") &&
          !line.includes("currmove")
        ) {
          const d = line.match(/depth (\d+)/);
          const cp = line.match(/score cp (-?\d+)/);
          const mate = line.match(/score mate (-?\d+)/);
          const wdl = line.match(/\bwdl (\d+) (\d+) (\d+)/);
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
            if (wdl) {
              bestWdl = {
                w: parseInt(wdl[1], 10),
                d: parseInt(wdl[2], 10),
                l: parseInt(wdl[3], 10),
              };
            }
            if (pvMatch) bestPv = pvMatch[1].trim().split(/\s+/).slice(0, 8);
          }
        }
        if (line.startsWith("bestmove")) {
          clearTimeout(timer);
          this.lineHandler = null;
          const bmMatch = line.match(/^bestmove (\S+)/);
          resolve({
            cp: bestCp,
            mate: bestMate,
            depth: bestDepth,
            pv: bestPv,
            bestMove: bmMatch?.[1] ?? bestPv[0],
            wdl: bestWdl,
          });
        }
      };
    });
  }

  kill() {
    try {
      this.sf.kill();
    } catch {
      /* ignore */
    }
  }
}

const engines = Array.from({ length: WORKERS }, (_, i) => new StockfishEngine(i));
let rr = 0;
let ready = false;

function pickEngine() {
  const eng = engines[rr % engines.length];
  rr += 1;
  return eng;
}

function evaluate(fen, depth = 16) {
  const cached = getCached(fen, depth);
  if (cached) return Promise.resolve(cached);
  return pickEngine().evaluate(fen, depth);
}

function isBlackToMove(fen) {
  return fen.split(" ")[1] === "b";
}

function flipForWhite(fen, result) {
  let cp = result.cp;
  let mate = result.mate;
  let wdl = result.wdl;
  if (isBlackToMove(fen)) {
    if (cp !== undefined) cp = -cp;
    if (mate !== undefined) mate = -mate;
    if (wdl) wdl = { w: wdl.l, d: wdl.d, l: wdl.w };
  }
  return {
    cp,
    mate,
    wdl,
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

  if (handleEngineShareRequest(req, res, url, { readJsonBody })) {
    return;
  }

  if (handleEngineSavedReviewsRequest(req, res, url, { readJsonBody })) {
    return;
  }

  if (handleEngineAboutCommentsRequest(req, res, url, { readJsonBody })) {
    return;
  }

  if (handleEngineBlogRequest(req, res, url, { readJsonBody, adminSecret })) {
    return;
  }

  if (
    handleEngineSiteSettingsRequest(req, res, url, {
      readJsonBody,
      adminSecret,
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
        workers: WORKERS,
        threads: THREADS,
        threadsTotal: WORKERS * THREADS,
        hashMb: HASH_MB,
        hashMbTotal: HASH_MB * WORKERS,
        cacheHits,
        cacheMisses,
        dedicated: DEDICATED,
        laptopMode: LAPTOP_MODE,
        ramGb: Math.floor(RAM_GB),
        cpuCount: CPU_COUNT,
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
      // Fan out across workers — each engine serializes its own queue.
      const results = await Promise.all(
        fens.map(async (fen) => {
          if (typeof fen !== "string" || !fen) {
            return { error: "invalid fen" };
          }
          const raw = await evaluate(fen, depth);
          return { fen, ...flipForWhite(fen, raw) };
        })
      );
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
  console.log(
    `Health:  http://${BIND === "0.0.0.0" ? "127.0.0.1" : BIND}:${PORT}/health`
  );
  if (BIND === "127.0.0.1") {
    console.log("For Vercel/tunnel: npm run laptop:server");
  }
});

Promise.all(engines.map((e) => e.init()))
  .then(() => {
    ready = true;
    console.log(`Stockfish: ${STOCKFISH_PATH}`);
    console.log(
      `Workers: ${WORKERS} × Threads: ${THREADS} (total ${WORKERS * THREADS}), ` +
        `Hash: ${HASH_MB}MB each (${HASH_MB * WORKERS}MB total), ` +
        `timeout: ${EVAL_TIMEOUT_MS}ms` +
        (DEDICATED ? " (dedicated server)" : LAPTOP_MODE ? " (laptop mode)" : "") +
        (MOVETIME_MS > 0 ? `, movetime: ${MOVETIME_MS}ms` : "")
    );
    console.log(
      `RAM: ~${Math.floor(RAM_GB)}GB, CPUs: ${CPU_COUNT}, cache entries: ${CACHE_MAX}`
    );
  })
  .catch((e) => {
    console.error("Init failed:", e);
    process.exit(1);
  });

function shutdown() {
  for (const e of engines) e.kill();
}

process.on("exit", shutdown);
process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});
process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});

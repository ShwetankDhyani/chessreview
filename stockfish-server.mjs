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
import { randomBytes } from "crypto";
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

function autoThreads() {
  // Dedicated host: prioritize fastest single review while keeping one core free.
  if (DEDICATED) {
    return Math.max(2, Math.min(6, CPU_COUNT - 1));
  }
  if (LAPTOP_MODE || RAM_GB < 8) {
    return Math.max(1, Math.min(2, Math.floor(CPU_COUNT / 2)));
  }
  return Math.max(1, Math.min(CPU_COUNT - 1, 12));
}

function autoHashMb() {
  if (DEDICATED && RAM_GB >= 12) return 1024;
  if (DEDICATED && RAM_GB >= 6) return 768;
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
  send("setoption name UCI_ShowWDL value true");
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
let avgBatchMsPerFen = 220;

const batchJobs = new Map();
const batchQueue = [];
let activeBatchJobId = null;
let activeRunId = null;
let activeRunLockedUntilMs = 0;
const runMeta = new Map(); // runId -> { priority, createdAtMs }
const BATCH_JOB_TTL_MS = 10 * 60 * 1000;
const ABANDONED_QUEUED_JOB_TTL_MS = parseInt(
  process.env.ABANDONED_QUEUED_JOB_TTL_MS ?? "15000",
  10
);
const RUN_LOCK_GRACE_MS = parseInt(
  process.env.RUN_LOCK_GRACE_MS ?? "8000",
  10
);

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

function newJobId() {
  return randomBytes(8).toString("base64url");
}

function estimateBatchMs(fenCount) {
  const perFen = Math.max(80, avgBatchMsPerFen);
  return Math.round(900 + perFen * Math.max(1, fenCount));
}

function normalizeQueuePriority(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return Date.now();
  return Math.floor(n);
}

function touchJob(job) {
  job.lastTouchedMs = Date.now();
}

function markJobCancelled(job, reason) {
  if (!job || job.status === "done" || job.status === "error" || job.status === "cancelled") {
    return;
  }
  job.status = "cancelled";
  job.error = reason || "Batch cancelled";
  job.finishedAtMs = Date.now();
}

function cleanupBatchJobs() {
  const now = Date.now();
  for (const job of batchJobs.values()) {
    if (
      job.status === "queued" &&
      now - (job.lastTouchedMs ?? job.createdAtMs) > ABANDONED_QUEUED_JOB_TTL_MS
    ) {
      markJobCancelled(job, "Batch cancelled (client disconnected)");
    }
  }

  for (const [id, job] of batchJobs) {
    const ts = job.finishedAtMs ?? job.createdAtMs;
    if (now - ts > BATCH_JOB_TTL_MS) {
      batchJobs.delete(id);
    }
  }

  // Remove stale ids from the queue array.
  for (let i = batchQueue.length - 1; i >= 0; i--) {
    const id = batchQueue[i];
    const job = batchJobs.get(id);
    if (!job || job.status !== "queued") batchQueue.splice(i, 1);
  }

  // Drop run metadata for runs that no longer have pending jobs.
  for (const [runId] of runMeta) {
    if (
      activeRunId != null &&
      String(runId) === String(activeRunId) &&
      now < activeRunLockedUntilMs
    ) {
      continue;
    }
    let hasPending = false;
    if (activeBatchJobId) {
      const activeJob = batchJobs.get(activeBatchJobId);
      if (activeJob && activeJob.runId === runId) hasPending = true;
    }
    if (!hasPending) {
      for (const job of batchJobs.values()) {
        if (job.runId === runId && (job.status === "queued" || job.status === "running")) {
          hasPending = true;
          break;
        }
      }
    }
    if (!hasPending) runMeta.delete(runId);
  }
}

function getPlannedRunIds() {
  const runIds = [];
  const seen = new Set();
  for (const job of batchJobs.values()) {
    if (!(job.status === "queued" || job.status === "running")) continue;
    const rid = String(job.runId);
    if (seen.has(rid)) continue;
    seen.add(rid);
    runIds.push(rid);
  }
  return runIds.sort((a, b) => {
    const ma = runMeta.get(a);
    const mb = runMeta.get(b);
    const pa = ma?.priority ?? 0;
    const pb = mb?.priority ?? 0;
    if (pa !== pb) return pa - pb;
    const ca = ma?.createdAtMs ?? 0;
    const cb = mb?.createdAtMs ?? 0;
    if (ca !== cb) return ca - cb;
    return a.localeCompare(b);
  });
}

function hasPendingJobsForRun(runId) {
  if (!runId) return false;
  for (const job of batchJobs.values()) {
    if (job.runId === runId && (job.status === "queued" || job.status === "running")) return true;
  }
  return false;
}

function getRunJobIdsInOrder(runId) {
  const jobs = [];
  for (const [id, job] of batchJobs) {
    if (job.runId !== runId) continue;
    if (job.status !== "queued" && job.status !== "running") continue;
    jobs.push(job);
  }
  jobs.sort((a, b) => {
    // Running job is "already started"; we still want it ordered first for ETA math.
    const as = a.status === "running" ? 0 : 1;
    const bs = b.status === "running" ? 0 : 1;
    if (as !== bs) return as - bs;
    if (a.createdAtMs !== b.createdAtMs) return a.createdAtMs - b.createdAtMs;
    return a.id.localeCompare(b.id);
  });
  return jobs.map((j) => j.id);
}

function pendingJobsForRunSorted(runId) {
  const jobs = [];
  for (const job of batchJobs.values()) {
    if (job.runId !== runId) continue;
    if (job.status === "queued" || job.status === "running") jobs.push(job);
  }
  jobs.sort((a, b) => {
    if (a.createdAtMs !== b.createdAtMs) return a.createdAtMs - b.createdAtMs;
    return a.id.localeCompare(b.id);
  });
  return jobs;
}

function queueStatusFor(jobId) {
  const job = batchJobs.get(jobId);
  if (!job) {
    return { queuePosition: 0, queueAhead: 0, etaMs: 0 };
  }

  const plannedRuns = getPlannedRunIds();
  const runIndex = plannedRuns.indexOf(String(job.runId));
  const isActiveRun = activeRunId != null && String(activeRunId) === String(job.runId);

  const queueAhead = runIndex >= 0 ? runIndex : 0;
  const queuePosition = isActiveRun ? 0 : runIndex >= 0 ? runIndex + 1 : 0;

  let etaMs = 0;

  // Sum time for runs ahead of this job's run.
  if (!isActiveRun && runIndex > 0) {
    for (let i = 0; i < runIndex; i++) {
      const rid = plannedRuns[i];
      const jobs = pendingJobsForRunSorted(rid);
      for (const j of jobs) {
        if (j.status === "running") {
          const elapsed = Date.now() - j.startedAtMs;
          etaMs += Math.max(0, (j.estimatedMs ?? 0) - elapsed);
        } else {
          etaMs += j.estimatedMs ?? estimateBatchMs(j.fens.length);
        }
      }
    }
  } else if (isActiveRun) {
    // Within the active run: account for the remaining time of the currently running chunk,
    // then add estimated time for queued chunks ahead of this one.
    const runningJob = activeBatchJobId ? batchJobs.get(activeBatchJobId) : null;
    if (runningJob && runningJob.status === "running") {
      const elapsed = Date.now() - runningJob.startedAtMs;
      etaMs += Math.max(0, (runningJob.estimatedMs ?? 0) - elapsed);
    }

    const orderedIds = getRunJobIdsInOrder(String(job.runId));
    const idx = orderedIds.indexOf(jobId);
    for (let k = 0; k < idx; k++) {
      const aheadId = orderedIds[k];
      if (aheadId === jobId) break;
      const aheadJob = batchJobs.get(aheadId);
      if (!aheadJob) continue;
      // running job already accounted above.
      if (aheadJob.status === "running") continue;
      etaMs += aheadJob.estimatedMs ?? estimateBatchMs(aheadJob.fens.length);
    }
  }

  return { queuePosition, queueAhead, etaMs };
}

function batchJobPayload(job) {
  const status = queueStatusFor(job.id);
  return {
    jobId: job.id,
    status: job.status,
    depth: job.depth,
    total: job.fens.length,
    done: job.done,
    queuePosition: status.queuePosition,
    queueAhead: status.queueAhead,
    etaMs: status.etaMs,
    estimatedMs: job.estimatedMs,
    createdAtMs: job.createdAtMs,
    startedAtMs: job.startedAtMs ?? null,
    finishedAtMs: job.finishedAtMs ?? null,
    results: job.status === "done" ? job.results : undefined,
    error: job.status === "error" || job.status === "cancelled" ? job.error : undefined,
  };
}

async function processBatchJob(job) {
  job.status = "running";
  job.startedAtMs = Date.now();
  const started = Date.now();
  const results = [];

  try {
    for (const fen of job.fens) {
      if (typeof fen !== "string" || !fen) {
        results.push({ error: "invalid fen" });
        job.done++;
        continue;
      }
      const raw = await evaluate(fen, job.depth);
      results.push({ fen, ...flipForWhite(fen, raw) });
      job.done++;
    }
    job.results = results;
    job.status = "done";
    job.finishedAtMs = Date.now();
  } catch (e) {
    job.status = "error";
    job.error = e instanceof Error ? e.message : "Batch failed";
    job.finishedAtMs = Date.now();
  } finally {
    const elapsed = Math.max(1, Date.now() - started);
    const perFen = elapsed / Math.max(1, job.fens.length);
    avgBatchMsPerFen = Math.round(avgBatchMsPerFen * 0.7 + perFen * 0.3);
  }
}

function pumpBatchQueue() {
  if (activeBatchJobId || batchQueue.length === 0) return;
  if (activeRunId == null) {
    const plannedRuns = getPlannedRunIds();
    activeRunId = plannedRuns[0] ?? null;
    activeRunLockedUntilMs = 0;
  }

  // If we have an active run, only run its jobs until it's drained.
  if (activeRunId != null) {
    // Find the next queued chunk job belonging to activeRunId.
    let nextId = null;
    for (const id of batchQueue) {
      const job = batchJobs.get(id);
      if (!job) continue;
      if (job.runId === activeRunId) {
        nextId = id;
        break;
      }
    }

    if (!nextId) {
      // No more pending jobs for this run. Let it drain and move on.
      const now = Date.now();
      if (activeRunLockedUntilMs > now) {
        // Within the grace window: wait for the client to enqueue additional chunks
        // for the same review run (e.g. deepening stage), instead of starting a newer run.
        return;
      }
      activeRunId = null;
      activeRunLockedUntilMs = 0;
      pumpBatchQueue();
      return;
    }

    const queueIdx = batchQueue.indexOf(nextId);
    if (queueIdx >= 0) batchQueue.splice(queueIdx, 1);

    const job = batchJobs.get(nextId);
    if (!job) {
      pumpBatchQueue();
      return;
    }

    activeBatchJobId = nextId;
    void processBatchJob(job).finally(() => {
      activeBatchJobId = null;
      cleanupBatchJobs();
      if (activeRunId != null && !hasPendingJobsForRun(activeRunId)) {
        // Keep this run as the active run for a short time so its next stage
        // can enqueue without being interleaved with another review.
        activeRunLockedUntilMs = Date.now() + RUN_LOCK_GRACE_MS;
      }
      pumpBatchQueue();
    });
  }
}

function enqueueBatchJob(fens, depth, priorityHint, runIdHint) {
  cleanupBatchJobs();
  const id = newJobId();
  const createdAtMs = Date.now();
  const priority = normalizeQueuePriority(priorityHint);

  // If runId isn't provided, treat this single job as its own run.
  const runId = runIdHint != null ? String(runIdHint) : id;
  const existing = runMeta.get(runId);
  if (!existing) {
    runMeta.set(runId, { priority, createdAtMs });
  }

  const job = {
    id,
    status: "queued",
    fens,
    depth,
    priority,
    runId,
    done: 0,
    results: null,
    error: null,
    createdAtMs,
    lastTouchedMs: createdAtMs,
    startedAtMs: null,
    finishedAtMs: null,
    estimatedMs: estimateBatchMs(fens.length),
  };
  batchJobs.set(id, job);
  batchQueue.push(id);
  pumpBatchQueue();
  return job;
}

async function _evaluate(fen, depth) {
  if (!ready) throw new Error("engine not ready");

  let bestCp, bestMate, bestDepth = 0, bestPv = [];
  let bestWdl = null;

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
        wdl: bestWdl,
      });
    }, EVAL_TIMEOUT_MS);

    lineHandler = (line) => {
      if (line.startsWith("info") && line.includes("depth") && !line.includes("currmove")) {
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
        lineHandler = null;
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
        threads: THREADS,
        hashMb: HASH_MB,
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
      if (body?.async === true || body?.async === 1 || body?.mode === "queue") {
        const job = enqueueBatchJob(
          fens,
          depth,
          body?.queuePriority ?? body?.reviewPriority,
          body?.runId ?? body?.reviewRunId ?? body?.analysisRunId
        );
        const payload = batchJobPayload(job);
        res.writeHead(202);
        res.end(JSON.stringify(payload));
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

  const batchJobMatch = url.pathname.match(/^\/eval\/batch\/([^/]+)$/);
  if (batchJobMatch && req.method === "GET") {
    cleanupBatchJobs();
    const id = decodeURIComponent(batchJobMatch[1]);
    const job = batchJobs.get(id);
    if (!job) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Batch job not found" }));
      return;
    }
    touchJob(job);
    const payload = batchJobPayload(job);
    res.writeHead(job.status === "queued" || job.status === "running" ? 202 : 200);
    res.end(JSON.stringify(payload));
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

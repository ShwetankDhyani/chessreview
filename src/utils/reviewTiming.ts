/** Adaptive review duration prediction from recent completed reviews. */

export const TIMING_SAMPLE_WINDOW = 120;
export const LOCAL_TIMING_MAX = 60;
export const MIN_DEPTH_SAMPLES = 3;
export const MIN_BUCKET_SAMPLES = 2;

/**
 * Only learn ETAs from reviews after the parallel full-depth engine path.
 * Pre-era samples (slow serial / consensus) are ignored.
 */
export const TIMING_ERA_START_MS = Date.parse("2026-07-16T10:00:00.000Z");

/** Bumped to drop stale local samples from the old slow pipeline. */
const LOCAL_STORAGE_KEY = "cr_review_timing_v2";

export interface TimingDepthRow {
  depth: number;
  count: number;
  medianMsPerPly: number;
  medianOverheadMs: number;
  medianDurationMs: number;
}

export interface TimingDepthPlyRow {
  depth: number;
  pliesMin: number;
  pliesMax: number;
  count: number;
  medianDurationMs: number;
}

export interface ReviewTimingModel {
  windowSize: number;
  sampleCount: number;
  updatedAt: string;
  eraStart?: string;
  global: {
    count: number;
    medianMsPerPly: number;
    medianOverheadMs: number;
    medianDurationMs: number;
  } | null;
  byDepth: TimingDepthRow[];
  byDepthPly: TimingDepthPlyRow[];
}

export interface LocalTimingSample {
  plies: number;
  depth: number;
  durationMs: number;
  recordedAt: number;
}

const PLY_BUCKETS = [
  { min: 1, max: 15 },
  { min: 16, max: 25 },
  { min: 26, max: 40 },
  { min: 41, max: 60 },
  { min: 61, max: 999 },
] as const;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function depthMetrics(
  list: Array<{ duration_ms: number; plies: number }>
): Omit<TimingDepthRow, "depth"> {
  const msPerPly = list.map((e) => e.duration_ms / e.plies);
  const medianMsPerPly = median(msPerPly);
  const overhead = list.map((e) => e.duration_ms - medianMsPerPly * e.plies);
  return {
    count: list.length,
    medianMsPerPly: Math.round(medianMsPerPly),
    medianOverheadMs: Math.round(median(overhead)),
    medianDurationMs: Math.round(median(list.map((e) => e.duration_ms))),
  };
}

function validSample(s: LocalTimingSample): boolean {
  return (
    s.durationMs > 500 &&
    s.plies > 0 &&
    s.depth >= 1 &&
    s.depth <= 30 &&
    s.recordedAt >= TIMING_ERA_START_MS
  );
}

/** Build timing model from raw samples (newest first). */
export function buildTimingModel(
  samples: LocalTimingSample[]
): ReviewTimingModel {
  const recent = samples
    .filter(validSample)
    .slice(0, TIMING_SAMPLE_WINDOW)
    .map((s) => ({
      duration_ms: s.durationMs,
      plies: s.plies,
      depth: s.depth,
    }));

  if (recent.length === 0) {
    return emptyTimingModel();
  }

  const global = depthMetrics(recent);

  const byDepthMap = new Map<number, typeof recent>();
  for (const e of recent) {
    const list = byDepthMap.get(e.depth) ?? [];
    list.push(e);
    byDepthMap.set(e.depth, list);
  }

  const byDepth: TimingDepthRow[] = [...byDepthMap.entries()]
    .map(([depth, list]) => ({ depth, ...depthMetrics(list) }))
    .sort((a, b) => a.depth - b.depth);

  const byDepthPly: TimingDepthPlyRow[] = [];
  for (const [depth, list] of byDepthMap) {
    for (const bucket of PLY_BUCKETS) {
      const inBucket = list.filter(
        (e) => e.plies >= bucket.min && e.plies <= bucket.max
      );
      if (inBucket.length >= MIN_BUCKET_SAMPLES) {
        byDepthPly.push({
          depth,
          pliesMin: bucket.min,
          pliesMax: bucket.max,
          count: inBucket.length,
          medianDurationMs: Math.round(
            median(inBucket.map((e) => e.duration_ms))
          ),
        });
      }
    }
  }

  return {
    windowSize: TIMING_SAMPLE_WINDOW,
    sampleCount: recent.length,
    updatedAt: new Date().toISOString(),
    eraStart: new Date(TIMING_ERA_START_MS).toISOString(),
    global,
    byDepth,
    byDepthPly,
  };
}

export function emptyTimingModel(): ReviewTimingModel {
  return {
    windowSize: TIMING_SAMPLE_WINDOW,
    sampleCount: 0,
    updatedAt: new Date().toISOString(),
    eraStart: new Date(TIMING_ERA_START_MS).toISOString(),
    global: null,
    byDepth: [],
    byDepthPly: [],
  };
}

/**
 * Static fallback tuned for parallel full-depth native reviews
 * (~2 Stockfish workers, one pass at requested depth).
 */
export function formulaFallbackDurationMs(plies: number, depth: number): number {
  const basePositions = Math.max(plies + 1, 8);
  // Extra fen-after-best evals when moves diverge from PV1
  const positions = Math.ceil(basePositions * 1.12);
  const workers = 2;
  const depthScale = Math.pow(1.18, Math.max(0, depth - 12));
  const msPerPosition = (42 + depth * 7) * depthScale;
  const evalMs = (positions / workers) * msPerPosition;
  const connectMs = 700;
  const classifyMs = 350 + plies * 6;
  const total = connectMs + evalMs + classifyMs;
  return Math.round(Math.min(180_000, Math.max(3_000, total)));
}

function blendHistorical(
  historical: number,
  formula: number,
  sampleCount: number
): number {
  // Prefer fresh samples quickly; keep a light formula anchor.
  const weight = Math.min(0.95, Math.max(0.45, sampleCount / 12));
  const blended = weight * historical + (1 - weight) * formula;
  return Math.round(Math.min(180_000, Math.max(2_500, blended)));
}

function predictFromModel(
  plies: number,
  depth: number,
  model: ReviewTimingModel | null
): { ms: number; confidence: number } | null {
  if (!model || model.sampleCount === 0) return null;
  const formula = formulaFallbackDurationMs(plies, depth);

  const bucket = model.byDepthPly.find(
    (b) =>
      b.depth === depth &&
      plies >= b.pliesMin &&
      plies <= b.pliesMax &&
      b.count >= MIN_BUCKET_SAMPLES
  );
  if (bucket) {
    return {
      ms: blendHistorical(bucket.medianDurationMs, formula, bucket.count),
      confidence: Math.min(0.95, 0.55 + bucket.count / 16),
    };
  }

  const depthRow = model.byDepth.find(
    (d) => d.depth === depth && d.count >= MIN_DEPTH_SAMPLES
  );
  if (depthRow) {
    const ms =
      depthRow.medianOverheadMs + depthRow.medianMsPerPly * Math.max(plies, 1);
    return {
      ms: blendHistorical(ms, formula, depthRow.count),
      confidence: Math.min(0.9, 0.45 + depthRow.count / 14),
    };
  }

  if (model.global) {
    const ms =
      model.global.medianOverheadMs +
      model.global.medianMsPerPly * Math.max(plies, 1);
    return {
      ms: blendHistorical(ms, formula, model.sampleCount),
      confidence: Math.min(0.75, 0.3 + model.sampleCount / 24),
    };
  }

  return null;
}

/** Merge server model with fresher local samples (local wins when it has depth data). */
export function mergeTimingModels(
  server: ReviewTimingModel | null,
  local: ReviewTimingModel | null
): ReviewTimingModel {
  if (!server || server.sampleCount === 0) return local ?? emptyTimingModel();
  if (!local || local.sampleCount === 0) return server;

  const localRecent = local.sampleCount;
  const localWeight = Math.min(0.8, localRecent / 16);

  const mergedByDepth = new Map<number, TimingDepthRow>();
  for (const row of server.byDepth) mergedByDepth.set(row.depth, row);
  for (const row of local.byDepth) {
    const existing = mergedByDepth.get(row.depth);
    if (!existing || row.count >= 1) {
      if (existing && row.count > 0) {
        const w = Math.min(0.8, row.count / (row.count + existing.count));
        mergedByDepth.set(row.depth, {
          depth: row.depth,
          count: row.count + existing.count,
          medianMsPerPly: Math.round(
            w * row.medianMsPerPly + (1 - w) * existing.medianMsPerPly
          ),
          medianOverheadMs: Math.round(
            w * row.medianOverheadMs + (1 - w) * existing.medianOverheadMs
          ),
          medianDurationMs: Math.round(
            w * row.medianDurationMs + (1 - w) * existing.medianDurationMs
          ),
        });
      } else {
        mergedByDepth.set(row.depth, row);
      }
    }
  }

  const mergedBuckets = [...server.byDepthPly];
  for (const row of local.byDepthPly) {
    const idx = mergedBuckets.findIndex(
      (b) =>
        b.depth === row.depth &&
        b.pliesMin === row.pliesMin &&
        b.pliesMax === row.pliesMax
    );
    if (idx >= 0) {
      const prev = mergedBuckets[idx];
      const w = Math.min(0.85, row.count / (row.count + prev.count));
      mergedBuckets[idx] = {
        ...row,
        count: row.count + prev.count,
        medianDurationMs: Math.round(
          w * row.medianDurationMs + (1 - w) * prev.medianDurationMs
        ),
      };
    } else {
      mergedBuckets.push(row);
    }
  }

  const gServer = server.global;
  const gLocal = local.global;
  const global =
    gServer && gLocal
      ? {
          count: gServer.count + gLocal.count,
          medianMsPerPly: Math.round(
            (1 - localWeight) * gServer.medianMsPerPly +
              localWeight * gLocal.medianMsPerPly
          ),
          medianOverheadMs: Math.round(
            (1 - localWeight) * gServer.medianOverheadMs +
              localWeight * gLocal.medianOverheadMs
          ),
          medianDurationMs: Math.round(
            (1 - localWeight) * gServer.medianDurationMs +
              localWeight * gLocal.medianDurationMs
          ),
        }
      : gLocal ?? gServer;

  return {
    windowSize: TIMING_SAMPLE_WINDOW,
    sampleCount: server.sampleCount + local.sampleCount,
    updatedAt: new Date().toISOString(),
    eraStart: new Date(TIMING_ERA_START_MS).toISOString(),
    global,
    byDepth: [...mergedByDepth.values()].sort((a, b) => a.depth - b.depth),
    byDepthPly: mergedBuckets,
  };
}

/** Predict review duration using merged historical model + formula fallback. */
export function predictReviewDurationMs(
  plies: number,
  depth: number,
  model: ReviewTimingModel | null
): number {
  const formula = formulaFallbackDurationMs(plies, depth);
  const hit = predictFromModel(plies, depth, model);
  return hit?.ms ?? formula;
}

export function loadLocalTimingSamples(): LocalTimingSample[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalTimingSample[];
    return Array.isArray(parsed) ? parsed.filter(validSample) : [];
  } catch {
    return [];
  }
}

export function appendLocalTimingSample(sample: LocalTimingSample): void {
  if (!validSample(sample)) return;
  try {
    const prev = loadLocalTimingSamples();
    const next = [sample, ...prev].slice(0, LOCAL_TIMING_MAX);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

export function localTimingModel(): ReviewTimingModel {
  return buildTimingModel(loadLocalTimingSamples());
}

export async function fetchServerTimingModel(): Promise<ReviewTimingModel | null> {
  const engineUrl = import.meta.env.VITE_EVAL_SERVER_URL?.replace(/\/$/, "");
  const sources = [
    "/api/stats/timing",
    engineUrl ? `${engineUrl}/stats/timing` : null,
  ].filter(Boolean) as string[];

  for (const url of sources) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = (await res.json()) as ReviewTimingModel;
      if (typeof data.sampleCount === "number") return data;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function loadAdaptiveTimingModel(): Promise<ReviewTimingModel> {
  const [server, local] = await Promise.all([
    fetchServerTimingModel(),
    Promise.resolve(localTimingModel()),
  ]);
  return mergeTimingModels(server, local);
}

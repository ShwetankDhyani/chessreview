/** Latest N completed reviews used to learn review duration trends. */
export const TIMING_SAMPLE_WINDOW = 120;

export const MIN_DEPTH_SAMPLES = 4;
export const MIN_BUCKET_SAMPLES = 3;

const PLY_BUCKETS = [
  { min: 1, max: 15 },
  { min: 16, max: 25 },
  { min: 26, max: 40 },
  { min: 41, max: 60 },
  { min: 61, max: 999 },
];

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function validEvent(e) {
  return (
    e &&
    Number(e.duration_ms) > 500 &&
    Number(e.plies) > 0 &&
    Number(e.depth) >= 1 &&
    Number(e.depth) <= 30
  );
}

function depthMetrics(list) {
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

/**
 * Build a timing model from recent review events (newest first).
 */
export function computeTimingModel(events = []) {
  const recent = events.filter(validEvent).slice(0, TIMING_SAMPLE_WINDOW);

  if (recent.length === 0) {
    return {
      windowSize: TIMING_SAMPLE_WINDOW,
      sampleCount: 0,
      updatedAt: new Date().toISOString(),
      global: null,
      byDepth: [],
      byDepthPly: [],
    };
  }

  const global = depthMetrics(recent);

  const byDepthMap = new Map();
  for (const e of recent) {
    const d = e.depth;
    if (!byDepthMap.has(d)) byDepthMap.set(d, []);
    byDepthMap.get(d).push(e);
  }

  const byDepth = [...byDepthMap.entries()]
    .map(([depth, list]) => ({ depth, ...depthMetrics(list) }))
    .sort((a, b) => a.depth - b.depth);

  const byDepthPly = [];
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
    global,
    byDepth,
    byDepthPly,
  };
}

/**
 * Shared Chess.com PubAPI / callback client (Node / Vercel).
 * Serial queue + Retry-After / exponential backoff — same policy as browser client.
 */

export const CHESSCOM_USER_AGENT =
  "ChessReview/1.0 (https://www.chessreview.org; profile+game import)";

const MIN_GAP_MS = 400;
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 60_000;
const COOLDOWN_403_MS = 30_000;

let chain = Promise.resolve();
let nextAllowedAt = 0;
let cooldownUntil = 0;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function parseRetryAfterMs(header) {
  if (!header) return null;
  const trimmed = String(header).trim();
  if (!trimmed) return null;
  const asSec = Number(trimmed);
  if (Number.isFinite(asSec) && asSec >= 0) {
    return Math.min(MAX_BACKOFF_MS, Math.ceil(asSec * 1000));
  }
  const asDate = Date.parse(trimmed);
  if (!Number.isNaN(asDate)) {
    return Math.min(MAX_BACKOFF_MS, Math.max(0, asDate - Date.now()));
  }
  return null;
}

export function chesscomBackoffDelayMs(
  status,
  attempt,
  retryAfter,
  random = Math.random
) {
  const fromHeader = parseRetryAfterMs(retryAfter);
  if (fromHeader != null) return Math.max(fromHeader, MIN_GAP_MS);

  if (status === 403) {
    return COOLDOWN_403_MS + Math.floor(random() * 500);
  }

  const exp = Math.min(
    MAX_BACKOFF_MS,
    BASE_BACKOFF_MS * 2 ** Math.max(0, attempt)
  );
  const jitter = Math.floor(random() * 300);
  return exp + jitter;
}

export function isChesscomRetryableStatus(status) {
  return (
    status === 429 ||
    status === 403 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

function enqueue(fn) {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

/**
 * Default request budget.
 *
 * Backoffs here can reach a 30s 403 cooldown or 60s exponential wait, which
 * outlives a serverless invocation. Without a budget the function is killed
 * mid-retry and the caller gets a platform timeout instead of a real answer,
 * so cap the whole operation and return the last response we actually saw.
 */
const DEFAULT_TIMEOUT_MS = 12_000;

/** Serial Chess.com fetch with status-aware backoff and a wall-clock budget. */
export async function chesscomFetch(url, init = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...requestInit } = init;
  // Start the clock now so time spent queueing counts against the budget.
  const deadlineAt =
    timeoutMs != null && timeoutMs > 0 ? Date.now() + timeoutMs : null;
  const remainingMs = () =>
    deadlineAt == null ? Number.POSITIVE_INFINITY : deadlineAt - Date.now();

  return enqueue(async () => {
    let lastError;
    let lastResponse = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (remainingMs() <= 0) break;

      const gate = Math.max(
        0,
        nextAllowedAt - Date.now(),
        cooldownUntil - Date.now()
      );
      if (gate > 0) {
        if (gate >= remainingMs()) break;
        await sleep(gate);
      }

      // Abort a stalled socket rather than letting it hold the serial queue.
      const controller = new AbortController();
      const timer =
        deadlineAt == null
          ? null
          : setTimeout(() => controller.abort(), Math.max(1, remainingMs()));

      let res;
      try {
        const headers = new Headers(requestInit.headers ?? {});
        if (!headers.has("Accept")) headers.set("Accept", "application/json");
        if (!headers.has("User-Agent")) {
          headers.set("User-Agent", CHESSCOM_USER_AGENT);
        }
        res = await fetch(url, {
          ...requestInit,
          headers,
          signal: controller.signal,
        });
        if (timer) clearTimeout(timer);
      } catch (e) {
        if (timer) clearTimeout(timer);
        lastError = e;
        if (e?.name === "AbortError") break;
        if (attempt >= MAX_RETRIES) throw e;
        const delay = chesscomBackoffDelayMs(503, attempt, null);
        if (delay >= remainingMs()) break;
        console.warn(
          `[chesscom] network error, backoff ${delay}ms (attempt ${attempt + 1})`
        );
        await sleep(delay);
        nextAllowedAt = Date.now() + MIN_GAP_MS;
        continue;
      }

      nextAllowedAt = Date.now() + MIN_GAP_MS;

      if (!isChesscomRetryableStatus(res.status) || attempt >= MAX_RETRIES) {
        return res;
      }

      const retryAfter = res.headers.get("Retry-After");
      const delay = chesscomBackoffDelayMs(res.status, attempt, retryAfter);
      try {
        await res.arrayBuffer();
      } catch {
        /* ignore */
      }
      lastResponse = res;

      // Out of budget: hand back the real status so the caller can distinguish
      // rate limiting from an outage instead of reporting a bare timeout.
      if (delay >= remainingMs()) return res;

      console.warn(
        `[chesscom] HTTP ${res.status}, backoff ${delay}ms` +
          (retryAfter ? ` (Retry-After: ${retryAfter})` : "") +
          ` attempt ${attempt + 1}/${MAX_RETRIES}`
      );
      cooldownUntil = Date.now() + delay;
      await sleep(delay);
      cooldownUntil = Date.now();
    }

    if (lastResponse) return lastResponse;
    throw lastError instanceof Error
      ? lastError
      : new Error("Chess.com request timed out");
  });
}

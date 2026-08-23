/**
 * Shared Chess.com PubAPI client (browser).
 *
 * Chess.com docs: serial access is effectively unlimited; parallel requests
 * get 429. Abnormal traffic can get the app blocked. We enforce:
 * - one in-flight request at a time (global queue)
 * - minimum gap between requests
 * - Retry-After / exponential backoff on 429, 403, 5xx
 */

export const CHESSCOM_USER_AGENT =
  "ChessReview/1.0 (https://www.chessreview.org; profile+game import)";

const MIN_GAP_MS = 400;
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 60_000;
const COOLDOWN_403_MS = 30_000;

let chain: Promise<unknown> = Promise.resolve();
let nextAllowedAt = 0;
let cooldownUntil = 0;

export type ChesscomBackoffInfo = {
  status: number;
  attempt: number;
  delayMs: number;
  retryAfter: string | null;
};

let onBackoff: ((info: ChesscomBackoffInfo) => void) | null = null;

/** Optional hook for UI / logging when we pause for Chess.com. */
export function setChesscomBackoffListener(
  fn: ((info: ChesscomBackoffInfo) => void) | null
): void {
  onBackoff = fn;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  if (signal?.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function parseRetryAfterMs(header: string | null | undefined): number | null {
  if (!header) return null;
  const trimmed = header.trim();
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

/** Pure helper — exported for tests. */
export function chesscomBackoffDelayMs(
  status: number,
  attempt: number,
  retryAfter: string | null,
  random: () => number = Math.random
): number {
  const fromHeader = parseRetryAfterMs(retryAfter);
  if (fromHeader != null) return Math.max(fromHeader, MIN_GAP_MS);

  if (status === 403) {
    return COOLDOWN_403_MS + Math.floor(random() * 500);
  }

  // 429 / 502 / 503 / 504 (and other retryable)
  const exp = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempt));
  const jitter = Math.floor(random() * 300);
  return exp + jitter;
}

export function isChesscomRetryableStatus(status: number): boolean {
  return (
    status === 429 ||
    status === 403 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export interface ChesscomFetchInit extends RequestInit {
  /**
   * Wall-clock budget for this request including queue wait, backoff and
   * transfer. Without it a retry chain can outlive the caller, and because the
   * queue is serial that zombie request also delays every later call.
   */
  timeoutMs?: number;
}

/**
 * Serial Chess.com fetch with status-aware backoff.
 * Browser may strip User-Agent; still send Accept + identify in comments/logs.
 */
export async function chesscomFetch(
  url: string,
  init: ChesscomFetchInit = {}
): Promise<Response> {
  const { timeoutMs, ...requestInit } = init;
  const externalSignal = requestInit.signal ?? undefined;
  // Start the clock at call time so queue waiting counts against the budget.
  const deadlineAt =
    timeoutMs != null && timeoutMs > 0 ? Date.now() + timeoutMs : null;

  const remainingMs = () =>
    deadlineAt == null ? Number.POSITIVE_INFINITY : deadlineAt - Date.now();

  return enqueue(async () => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (externalSignal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      if (remainingMs() <= 0) break;

      const gate = Math.max(
        0,
        nextAllowedAt - Date.now(),
        cooldownUntil - Date.now()
      );
      if (gate > 0) {
        if (gate >= remainingMs()) break;
        await sleep(gate, externalSignal);
      }

      // Bound each attempt by the remaining budget and actually abort it,
      // so a stalled socket cannot hold the serial queue open.
      const attemptController = new AbortController();
      let attemptTimer: ReturnType<typeof setTimeout> | null = null;
      if (deadlineAt != null) {
        attemptTimer = setTimeout(
          () => attemptController.abort(new DOMException("Timeout", "AbortError")),
          Math.max(1, remainingMs())
        );
      }
      const onExternalAbort = () =>
        attemptController.abort(new DOMException("Aborted", "AbortError"));
      externalSignal?.addEventListener("abort", onExternalAbort, { once: true });

      const cleanup = () => {
        if (attemptTimer) clearTimeout(attemptTimer);
        externalSignal?.removeEventListener("abort", onExternalAbort);
      };

      let res: Response;
      try {
        const headers = new Headers(requestInit.headers);
        if (!headers.has("Accept")) headers.set("Accept", "application/json");
        // Browsers forbid setting User-Agent; harmless no-op there, used in Node/tests.
        if (!headers.has("User-Agent")) {
          headers.set("User-Agent", CHESSCOM_USER_AGENT);
        }
        res = await fetch(url, {
          ...requestInit,
          headers,
          cache: "no-store",
          signal: attemptController.signal,
        });
        cleanup();
      } catch (e) {
        cleanup();
        lastError = e;
        if (externalSignal?.aborted) throw new DOMException("Aborted", "AbortError");
        if (e instanceof DOMException && e.name === "AbortError") {
          // Our own deadline fired.
          break;
        }
        if (attempt >= MAX_RETRIES) throw e;
        const delay = chesscomBackoffDelayMs(503, attempt, null);
        if (delay >= remainingMs()) break;
        onBackoff?.({ status: 0, attempt, delayMs: delay, retryAfter: null });
        await sleep(delay, externalSignal);
        nextAllowedAt = Date.now() + MIN_GAP_MS;
        continue;
      }

      nextAllowedAt = Date.now() + MIN_GAP_MS;

      if (!isChesscomRetryableStatus(res.status) || attempt >= MAX_RETRIES) {
        return res;
      }

      const retryAfter = res.headers.get("Retry-After");
      const delay = chesscomBackoffDelayMs(res.status, attempt, retryAfter);
      // Consume body so the connection can close cleanly before retry.
      try {
        await res.arrayBuffer();
      } catch {
        /* ignore */
      }
      // No budget left to wait out this backoff — hand the response back so the
      // caller can classify it (429 vs 503) instead of reporting a bare timeout.
      if (delay >= remainingMs()) return res;

      onBackoff?.({
        status: res.status,
        attempt,
        delayMs: delay,
        retryAfter,
      });
      cooldownUntil = Date.now() + delay;
      await sleep(delay, externalSignal);
      cooldownUntil = Date.now();
    }

    if (lastError instanceof Error) throw lastError;
    throw new Error("Chess.com request timed out");
  });
}

export function chesscomPlayerUrl(username: string): string {
  return `https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}`;
}

export function chesscomPlayerStatsUrl(username: string): string {
  return `${chesscomPlayerUrl(username)}/stats`;
}

export function chesscomArchivesUrl(username: string): string {
  return `${chesscomPlayerUrl(username)}/games/archives`;
}

export function chesscomMonthGamesUrl(
  username: string,
  year: number,
  month: number
): string {
  const mm = String(month).padStart(2, "0");
  return `${chesscomPlayerUrl(username)}/games/${year}/${mm}`;
}

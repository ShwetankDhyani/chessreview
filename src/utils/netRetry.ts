/**
 * Shared networking primitives for the Chess.com / Lichess game importers.
 *
 * Three properties matter for these upstreams:
 * 1. Timeouts must genuinely abort. A timeout that only rejects a wrapper
 *    promise leaves the request running, which keeps holding the Chess.com
 *    serial queue and makes the *next* attempt fail too.
 * 2. Retries must respect a deadline. Otherwise a caller that waits 20s can sit
 *    behind a backoff chain that runs for minutes.
 * 3. Failures must be typed. Classifying by substring means an upstream blip
 *    whose text happens to contain "not found" can unlink a valid profile.
 */

/** Non-2xx response from an upstream, with any Retry-After already parsed. */
export class HttpStatusError extends Error {
  readonly status: number;
  readonly retryAfterMs: number | null;

  constructor(status: number, message: string, retryAfterMs: number | null = null) {
    super(message);
    this.name = "HttpStatusError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

/** The caller's time budget elapsed. */
export class TimeoutError extends Error {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

/** Upstream confirmed the account does not exist (404/400). Never retried. */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

/** Transport-level failure: offline, DNS, CORS, TLS, connection reset. */
export class NetworkError extends Error {
  constructor(message = "Network request failed") {
    super(message);
    this.name = "NetworkError";
  }
}

export function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException && error.name === "AbortError"
  ) || (error instanceof Error && error.name === "AbortError");
}

/**
 * Statuses worth another attempt. 403 is included because Chess.com returns it
 * for short-lived throttling rather than a true authorization failure.
 */
export function isTransientStatus(status: number): boolean {
  return (
    status === 408 ||
    status === 425 ||
    status === 429 ||
    status === 403 ||
    status >= 500
  );
}

export function parseRetryAfterMs(
  header: string | null | undefined,
  maxMs = 60_000
): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (!trimmed) return null;

  const asSeconds = Number(trimmed);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return Math.min(maxMs, Math.ceil(asSeconds * 1000));
  }

  const asDate = Date.parse(trimmed);
  if (!Number.isNaN(asDate)) {
    return Math.min(maxMs, Math.max(0, asDate - Date.now()));
  }
  return null;
}

export function computeBackoffMs(opts: {
  attempt: number;
  baseMs?: number;
  maxMs?: number;
  retryAfterMs?: number | null;
  random?: () => number;
}): number {
  const {
    attempt,
    baseMs = 500,
    maxMs = 8_000,
    retryAfterMs = null,
    random = Math.random,
  } = opts;

  if (retryAfterMs != null) return Math.min(maxMs, Math.max(0, retryAfterMs));

  const exponential = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt));
  // Full jitter avoids retry storms when several requests fail together.
  return Math.floor(exponential / 2 + random() * (exponential / 2));
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  if (signal?.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Combine abort sources into one signal.
 * `AbortSignal.any` is not available in every browser we support.
 */
export function linkSignals(
  ...signals: Array<AbortSignal | undefined | null>
): { signal: AbortSignal; dispose: () => void } {
  const present = signals.filter((s): s is AbortSignal => !!s);
  const controller = new AbortController();

  const already = present.find((s) => s.aborted);
  if (already) {
    controller.abort(already.reason);
    return { signal: controller.signal, dispose: () => {} };
  }

  const onAbort = (event: Event) => {
    controller.abort((event.target as AbortSignal)?.reason);
  };
  for (const s of present) s.addEventListener("abort", onAbort, { once: true });

  return {
    signal: controller.signal,
    dispose: () => {
      for (const s of present) s.removeEventListener("abort", onAbort);
    },
  };
}

/** Tracks a wall-clock budget shared across retries of one logical operation. */
export class Deadline {
  private readonly endsAt: number;

  constructor(budgetMs: number) {
    this.endsAt = Date.now() + Math.max(0, budgetMs);
  }

  get remainingMs(): number {
    return Math.max(0, this.endsAt - Date.now());
  }

  get expired(): boolean {
    return this.remainingMs <= 0;
  }

  /** True when `ms` of waiting would leave no time to actually retry. */
  cannotAfford(ms: number): boolean {
    return ms + 250 >= this.remainingMs;
  }
}

/**
 * A single fetch that cannot outlive `timeoutMs`.
 *
 * For endpoints where retrying is not appropriate (writes, one-shot reads) but
 * an unbounded wait is still unacceptable — the browser's own timeout can be
 * minutes, during which the UI simply looks stuck.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit | undefined,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException("Timeout", "AbortError")),
    Math.max(1, timeoutMs)
  );
  const linked = linkSignals(init?.signal, controller.signal);

  try {
    return await fetch(url, { ...init, signal: linked.signal });
  } catch (error) {
    // Distinguish our deadline from the caller cancelling.
    if (isAbortError(error) && !init?.signal?.aborted) {
      throw new TimeoutError("Request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timer);
    linked.dispose();
  }
}

export interface RetryingFetchOptions extends Omit<RequestInit, "signal"> {
  /** Total budget for the whole operation, including retries and backoff. */
  timeoutMs?: number;
  /** Ceiling on attempts; the deadline usually binds first. */
  attempts?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  /** External cancellation (component unmount, user pressed Cancel). */
  signal?: AbortSignal | null;
  /** Statuses treated as a definitive "no such account". */
  notFoundStatuses?: number[];
  notFoundMessage?: string;
  /** Called before each backoff pause, for progress UI. */
  onRetry?: (info: { attempt: number; delayMs: number; status: number }) => void;
  /** Injectable for deterministic tests. */
  fetchImpl?: typeof fetch;
  random?: () => number;
}

/**
 * Fetch with genuine abort-based timeouts and deadline-aware retries.
 * Resolves only with a 2xx response; everything else throws a typed error.
 */
export async function retryingFetch(
  url: string,
  options: RetryingFetchOptions = {}
): Promise<Response> {
  const {
    timeoutMs = 20_000,
    attempts = 4,
    baseBackoffMs = 500,
    maxBackoffMs = 8_000,
    signal: externalSignal,
    notFoundStatuses = [404],
    notFoundMessage = "Not found",
    onRetry,
    fetchImpl = fetch,
    random = Math.random,
    ...init
  } = options;

  const deadline = new Deadline(timeoutMs);
  let lastError: unknown = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (externalSignal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    if (deadline.expired) break;

    // Each attempt gets whatever budget remains, so a stalled connection
    // cannot outlive the caller's deadline.
    const attemptController = new AbortController();
    const attemptTimer = setTimeout(
      () => attemptController.abort(new DOMException("Timeout", "AbortError")),
      deadline.remainingMs
    );
    const linked = linkSignals(externalSignal, attemptController.signal);

    let res: Response;
    try {
      res = await fetchImpl(url, { ...init, signal: linked.signal });
    } catch (error) {
      clearTimeout(attemptTimer);
      linked.dispose();

      // A caller-initiated abort must propagate untouched.
      if (externalSignal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      if (isAbortError(error)) {
        throw new TimeoutError("Request timed out");
      }

      lastError = new NetworkError(
        error instanceof Error ? error.message : "Network request failed"
      );
      const delay = computeBackoffMs({
        attempt,
        baseMs: baseBackoffMs,
        maxMs: maxBackoffMs,
        random,
      });
      if (attempt + 1 >= attempts || deadline.cannotAfford(delay)) break;
      onRetry?.({ attempt, delayMs: delay, status: 0 });
      await sleep(delay, externalSignal ?? undefined);
      continue;
    }

    clearTimeout(attemptTimer);
    linked.dispose();

    if (res.ok) return res;

    if (notFoundStatuses.includes(res.status)) {
      throw new NotFoundError(notFoundMessage);
    }

    const retryAfterMs = parseRetryAfterMs(
      res.headers.get("Retry-After"),
      maxBackoffMs
    );
    const statusError = new HttpStatusError(
      res.status,
      `Upstream responded ${res.status}`,
      retryAfterMs
    );

    if (!isTransientStatus(res.status)) throw statusError;

    lastError = statusError;
    // Drain the body so the socket can be reused on the retry.
    try {
      await res.arrayBuffer();
    } catch {
      /* ignore */
    }

    const delay = computeBackoffMs({
      attempt,
      baseMs: baseBackoffMs,
      maxMs: maxBackoffMs,
      retryAfterMs,
      random,
    });
    if (attempt + 1 >= attempts || deadline.cannotAfford(delay)) break;
    onRetry?.({ attempt, delayMs: delay, status: res.status });
    await sleep(delay, externalSignal ?? undefined);
  }

  if (lastError instanceof HttpStatusError || lastError instanceof NetworkError) {
    throw lastError;
  }
  throw new TimeoutError("Request timed out");
}

import { describe, expect, it, vi } from "vitest";
import {
  computeBackoffMs,
  Deadline,
  HttpStatusError,
  isTransientStatus,
  linkSignals,
  NetworkError,
  NotFoundError,
  parseRetryAfterMs,
  retryingFetch,
  TimeoutError,
} from "./netRetry";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function statusResponse(status: number, headers: Record<string, string> = {}) {
  return new Response("", { status, headers });
}

describe("parseRetryAfterMs", () => {
  it("parses delay-seconds", () => {
    expect(parseRetryAfterMs("2")).toBe(2000);
    expect(parseRetryAfterMs("0.5")).toBe(500);
  });

  it("parses an HTTP date", () => {
    const when = new Date(Date.now() + 5_000).toUTCString();
    const ms = parseRetryAfterMs(when);
    expect(ms).toBeGreaterThan(1_000);
    expect(ms).toBeLessThanOrEqual(60_000);
  });

  it("caps at the supplied maximum", () => {
    expect(parseRetryAfterMs("9999", 5_000)).toBe(5_000);
  });

  it("returns null for missing or junk values", () => {
    expect(parseRetryAfterMs(null)).toBeNull();
    expect(parseRetryAfterMs("")).toBeNull();
    expect(parseRetryAfterMs("soon")).toBeNull();
  });
});

describe("isTransientStatus", () => {
  it("treats throttling and server faults as retryable", () => {
    for (const s of [408, 425, 429, 403, 500, 502, 503, 504]) {
      expect(isTransientStatus(s)).toBe(true);
    }
  });

  it("treats client errors as permanent", () => {
    for (const s of [200, 400, 401, 404, 410]) {
      expect(isTransientStatus(s)).toBe(false);
    }
  });
});

describe("computeBackoffMs", () => {
  it("prefers Retry-After over exponential growth", () => {
    expect(
      computeBackoffMs({ attempt: 3, retryAfterMs: 1500, random: () => 0 })
    ).toBe(1500);
  });

  it("grows with attempt number", () => {
    const first = computeBackoffMs({ attempt: 0, random: () => 1 });
    const later = computeBackoffMs({ attempt: 3, random: () => 1 });
    expect(later).toBeGreaterThan(first);
  });

  it("never exceeds the ceiling", () => {
    const delay = computeBackoffMs({ attempt: 20, maxMs: 4_000, random: () => 1 });
    expect(delay).toBeLessThanOrEqual(4_000);
  });
});

describe("Deadline", () => {
  it("reports remaining budget and expiry", () => {
    const d = new Deadline(0);
    expect(d.expired).toBe(true);
    expect(new Deadline(5_000).remainingMs).toBeGreaterThan(4_000);
  });

  it("refuses waits that would consume the whole budget", () => {
    const d = new Deadline(1_000);
    expect(d.cannotAfford(50)).toBe(false);
    expect(d.cannotAfford(5_000)).toBe(true);
  });
});

describe("linkSignals", () => {
  it("aborts when any source aborts", () => {
    const a = new AbortController();
    const b = new AbortController();
    const { signal } = linkSignals(a.signal, b.signal);
    expect(signal.aborted).toBe(false);
    b.abort();
    expect(signal.aborted).toBe(true);
  });

  it("starts aborted when a source already aborted", () => {
    const a = new AbortController();
    a.abort();
    expect(linkSignals(a.signal).signal.aborted).toBe(true);
  });
});

describe("retryingFetch", () => {
  it("returns the first successful response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const res = await retryingFetch("https://example.test/a", { fetchImpl });
    expect(res.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries a 429 and then succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(statusResponse(429, { "Retry-After": "0" }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const res = await retryingFetch("https://example.test/b", {
      fetchImpl,
      baseBackoffMs: 1,
      maxBackoffMs: 2,
    });

    expect(res.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("retries transient server errors", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(statusResponse(503))
      .mockResolvedValueOnce(statusResponse(502))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const res = await retryingFetch("https://example.test/c", {
      fetchImpl,
      baseBackoffMs: 1,
      maxBackoffMs: 2,
    });

    expect(res.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("throws NotFoundError immediately and does not retry", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(statusResponse(404));
    await expect(
      retryingFetch("https://example.test/d", {
        fetchImpl,
        notFoundMessage: "no such user",
      })
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("treats configured statuses as not-found", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(statusResponse(400));
    await expect(
      retryingFetch("https://example.test/e", {
        fetchImpl,
        notFoundStatuses: [400, 404],
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("does not retry a permanent client error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(statusResponse(401));
    await expect(
      retryingFetch("https://example.test/f", { fetchImpl })
    ).rejects.toBeInstanceOf(HttpStatusError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("surfaces the last status once attempts run out", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(statusResponse(503));
    const err = await retryingFetch("https://example.test/g", {
      fetchImpl,
      attempts: 2,
      baseBackoffMs: 1,
      maxBackoffMs: 2,
    }).catch((e) => e);

    expect(err).toBeInstanceOf(HttpStatusError);
    expect((err as HttpStatusError).status).toBe(503);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("retries transport failures and reports NetworkError", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const err = await retryingFetch("https://example.test/h", {
      fetchImpl,
      attempts: 2,
      baseBackoffMs: 1,
      maxBackoffMs: 2,
    }).catch((e) => e);

    expect(err).toBeInstanceOf(NetworkError);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("stops retrying when the deadline cannot fund another wait", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(statusResponse(503));
    const err = await retryingFetch("https://example.test/i", {
      fetchImpl,
      timeoutMs: 30,
      attempts: 10,
      baseBackoffMs: 5_000,
      maxBackoffMs: 5_000,
    }).catch((e) => e);

    expect(err).toBeInstanceOf(HttpStatusError);
    // Budget stops this well before the 10-attempt ceiling.
    expect(fetchImpl.mock.calls.length).toBeLessThan(3);
  });

  it("aborts the underlying request when the deadline fires", async () => {
    let observed: AbortSignal | undefined;
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => {
      observed = init?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        observed?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError"))
        );
      });
    }) as unknown as typeof fetch;

    await expect(
      retryingFetch("https://example.test/j", { fetchImpl, timeoutMs: 20 })
    ).rejects.toBeInstanceOf(TimeoutError);

    expect(observed?.aborted).toBe(true);
  });

  it("propagates caller cancellation as an AbortError", async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError"))
        );
      });
    }) as unknown as typeof fetch;

    const pending = retryingFetch("https://example.test/k", {
      fetchImpl,
      signal: controller.signal,
      timeoutMs: 5_000,
    });
    controller.abort();

    const err = await pending.catch((e) => e);
    expect(err).toBeInstanceOf(DOMException);
    expect((err as DOMException).name).toBe("AbortError");
  });
});

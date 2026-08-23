import { afterEach, describe, expect, it, vi } from "vitest";
import {
  chesscomBackoffDelayMs,
  chesscomFetch,
  isChesscomRetryableStatus,
  parseRetryAfterMs,
} from "./chesscomClient.mjs";

describe("chesscom backoff helpers", () => {
  it("parses Retry-After seconds", () => {
    expect(parseRetryAfterMs("2")).toBe(2000);
    expect(parseRetryAfterMs("0.5")).toBe(500);
  });

  it("honors Retry-After over exponential for 429", () => {
    expect(chesscomBackoffDelayMs(429, 0, "3", () => 0)).toBe(3000);
  });

  it("uses longer cooldown for 403 without Retry-After", () => {
    expect(chesscomBackoffDelayMs(403, 0, null, () => 0)).toBeGreaterThanOrEqual(
      30_000
    );
  });

  it("marks 429/403/5xx as retryable", () => {
    expect(isChesscomRetryableStatus(429)).toBe(true);
    expect(isChesscomRetryableStatus(403)).toBe(true);
    expect(isChesscomRetryableStatus(503)).toBe(true);
    expect(isChesscomRetryableStatus(404)).toBe(false);
    expect(isChesscomRetryableStatus(200)).toBe(false);
  });
});

describe("chesscomFetch budget", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns a successful response without retrying", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await chesscomFetch("https://api.chess.com/pub/player/x");
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives back the real status instead of hanging past the budget", async () => {
    // A 403 cooldown is 30s. With a small budget the call must return the
    // throttling status promptly rather than outliving its serverless
    // invocation and surfacing as an opaque platform timeout.
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);

    const startedAt = Date.now();
    const res = await chesscomFetch("https://api.chess.com/pub/player/y", {
      timeoutMs: 1_000,
    });

    expect(res.status).toBe(403);
    expect(Date.now() - startedAt).toBeLessThan(3_000);
  });

  it("aborts the request when the budget expires", async () => {
    const fetchMock = vi.fn(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("Aborted");
            err.name = "AbortError";
            reject(err);
          });
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      chesscomFetch("https://api.chess.com/pub/player/z", { timeoutMs: 50 })
    ).rejects.toThrow(/abort|timed out/i);
  });
});

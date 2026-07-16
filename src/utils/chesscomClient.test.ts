import { describe, expect, it } from "vitest";
import {
  chesscomBackoffDelayMs,
  isChesscomRetryableStatus,
  parseRetryAfterMs,
} from "./chesscomClient";

describe("chesscom backoff helpers", () => {
  it("parses Retry-After seconds", () => {
    expect(parseRetryAfterMs("2")).toBe(2000);
    expect(parseRetryAfterMs("0.5")).toBe(500);
  });

  it("parses Retry-After HTTP date", () => {
    const when = new Date(Date.now() + 5_000).toUTCString();
    const ms = parseRetryAfterMs(when);
    expect(ms).toBeGreaterThan(1_000);
    expect(ms).toBeLessThanOrEqual(60_000);
  });

  it("honors Retry-After over exponential for 429", () => {
    const delay = chesscomBackoffDelayMs(429, 0, "3", () => 0);
    expect(delay).toBe(3000);
  });

  it("uses longer cooldown for 403 without Retry-After", () => {
    const delay = chesscomBackoffDelayMs(403, 0, null, () => 0);
    expect(delay).toBeGreaterThanOrEqual(30_000);
  });

  it("exponential backoff grows with attempt", () => {
    const a0 = chesscomBackoffDelayMs(429, 0, null, () => 0);
    const a2 = chesscomBackoffDelayMs(429, 2, null, () => 0);
    expect(a2).toBeGreaterThan(a0);
  });

  it("marks 429/403/5xx as retryable", () => {
    expect(isChesscomRetryableStatus(429)).toBe(true);
    expect(isChesscomRetryableStatus(403)).toBe(true);
    expect(isChesscomRetryableStatus(503)).toBe(true);
    expect(isChesscomRetryableStatus(404)).toBe(false);
    expect(isChesscomRetryableStatus(200)).toBe(false);
  });
});

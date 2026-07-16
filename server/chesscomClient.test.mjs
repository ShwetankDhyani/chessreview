import { describe, expect, it } from "vitest";
import {
  chesscomBackoffDelayMs,
  isChesscomRetryableStatus,
  parseRetryAfterMs,
} from "./chesscomClient.mjs";

describe("server chesscom backoff helpers", () => {
  it("parses Retry-After and grows exponential delay", () => {
    expect(parseRetryAfterMs("1")).toBe(1000);
    expect(chesscomBackoffDelayMs(429, 0, "2", () => 0)).toBe(2000);
    expect(chesscomBackoffDelayMs(429, 3, null, () => 0)).toBeGreaterThan(
      chesscomBackoffDelayMs(429, 0, null, () => 0)
    );
  });

  it("treats 429/403/502-504 as retryable", () => {
    expect(isChesscomRetryableStatus(429)).toBe(true);
    expect(isChesscomRetryableStatus(404)).toBe(false);
  });
});

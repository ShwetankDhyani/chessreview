import { describe, expect, it } from "vitest";
import { normalizeGameLoadError } from "./appError";
import {
  HttpStatusError,
  NetworkError,
  NotFoundError,
  TimeoutError,
} from "./netRetry";

describe("normalizeGameLoadError", () => {
  it("names the platform on timeout and points to link/PGN", () => {
    const err = normalizeGameLoadError(new Error("Game fetch timeout"), "lichess");
    expect(err.message).toContain("Lichess");
    expect(err.message).toMatch(/link|PGN/i);
    expect(err.message).not.toMatch(/Chess\.com/);
  });

  it("uses Chess.com wording when that platform fails", () => {
    const err = normalizeGameLoadError(new Error("timeout"), "chesscom");
    expect(err.message).toContain("Chess.com");
  });

  it("classifies a typed timeout as retryable", () => {
    const err = normalizeGameLoadError(new TimeoutError(), "lichess");
    expect(err.code).toBe("GAME_FETCH_TIMEOUT");
    expect(err.retryable).toBe(true);
  });

  it("classifies a confirmed 404 as a missing profile", () => {
    const err = normalizeGameLoadError(new NotFoundError("nope"), "chesscom");
    expect(err.code).toBe("GAME_SOURCE_NOT_FOUND");
    expect(err.retryable).toBe(false);
  });

  it("separates rate limiting from generic failure", () => {
    for (const status of [429, 403]) {
      const err = normalizeGameLoadError(
        new HttpStatusError(status, `Upstream responded ${status}`),
        "chesscom"
      );
      expect(err.code).toBe("GAME_RATE_LIMITED");
      expect(err.retryable).toBe(true);
    }
  });

  it("reports upstream 5xx as a platform outage", () => {
    const err = normalizeGameLoadError(
      new HttpStatusError(503, "Upstream responded 503"),
      "lichess"
    );
    expect(err.code).toBe("GAME_SOURCE_UNAVAILABLE");
    expect(err.retryable).toBe(true);
  });

  it("reports transport failures as a connection problem", () => {
    const err = normalizeGameLoadError(new NetworkError(), "chesscom");
    expect(err.code).toBe("GAME_NETWORK_ERROR");
    expect(err.retryable).toBe(true);
  });

  it("never unlinks a profile because of a transient 5xx", () => {
    // GAME_SOURCE_NOT_FOUND removes the saved profile, so only a confirmed
    // 404 may produce it. Anything retryable must not.
    const transient = [
      new HttpStatusError(500, "Upstream responded 500"),
      new HttpStatusError(429, "Upstream responded 429"),
      new NetworkError(),
      new TimeoutError(),
      new Error("archives temporarily not available"),
    ];
    for (const error of transient) {
      expect(normalizeGameLoadError(error, "chesscom").code).not.toBe(
        "GAME_SOURCE_NOT_FOUND"
      );
    }
  });

  it("still recognizes the legacy not-found message shape", () => {
    const err = normalizeGameLoadError(
      new Error('Player "ghost" not found on Chess.com'),
      "chesscom"
    );
    expect(err.code).toBe("GAME_SOURCE_NOT_FOUND");
  });
});

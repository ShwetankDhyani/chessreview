import { describe, expect, it } from "vitest";
import { normalizeGameLoadError } from "./appError";

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
});

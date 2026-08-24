import { describe, expect, it, vi } from "vitest";
import { fillMissingWithWasm } from "./evalCache";
import type { PositionAnalysis } from "./types";

function analysis(fen: string): PositionAnalysis {
  return {
    fen,
    depth: 18,
    lines: [{ multipv: 1, cp: 10, depth: 18, pv: ["e2e4"], bestMove: "e2e4" }],
  };
}

const FENS = ["fen-a", "fen-b", "fen-c", "fen-d"];

describe("fillMissingWithWasm", () => {
  it("analyses only positions missing from the cache", async () => {
    const cache = new Map<string, PositionAnalysis>();
    cache.set("fen-a", analysis("fen-a"));
    const analyze = vi.fn(async (fen: string) => analysis(fen));

    await fillMissingWithWasm(cache, FENS, 18, 3, analyze);

    expect(analyze).toHaveBeenCalledTimes(3);
    expect(cache.size).toBe(4);
  });

  it("stops when the caller cancels", async () => {
    // Cancel must halt the loop, not merely discard the result: each remaining
    // position would otherwise keep the engine busy.
    const cache = new Map<string, PositionAnalysis>();
    const controller = new AbortController();
    const analyze = vi.fn(async (fen: string) => {
      controller.abort();
      return analysis(fen);
    });

    await fillMissingWithWasm(cache, FENS, 18, 3, analyze, {
      signal: controller.signal,
    });

    expect(analyze).toHaveBeenCalledTimes(1);
  });

  it("does not start when already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    const analyze = vi.fn(async (fen: string) => analysis(fen));

    await fillMissingWithWasm(new Map(), FENS, 18, 3, analyze, {
      signal: controller.signal,
    });

    expect(analyze).not.toHaveBeenCalled();
  });

  it("stops once the time budget is spent", async () => {
    const cache = new Map<string, PositionAnalysis>();
    const analyze = vi.fn(async (fen: string) => {
      await new Promise((r) => setTimeout(r, 25));
      return analysis(fen);
    });

    await fillMissingWithWasm(cache, FENS, 18, 3, analyze, { budgetMs: 40 });

    // The budget must bind before every position is attempted.
    expect(analyze.mock.calls.length).toBeLessThan(FENS.length);
  });

  it("passes the abort signal down to the engine call", async () => {
    const controller = new AbortController();
    const analyze = vi.fn(async (fen: string, opts) => {
      expect(opts.signal).toBe(controller.signal);
      return analysis(fen);
    });

    await fillMissingWithWasm(new Map(), ["fen-a"], 18, 3, analyze, {
      signal: controller.signal,
    });
    expect(analyze).toHaveBeenCalledTimes(1);
  });

  it("keeps going when one position fails", async () => {
    const cache = new Map<string, PositionAnalysis>();
    const analyze = vi.fn(async (fen: string) => {
      if (fen === "fen-b") throw new Error("engine blew up");
      return analysis(fen);
    });

    await fillMissingWithWasm(cache, FENS, 18, 3, analyze);

    expect(analyze).toHaveBeenCalledTimes(4);
    expect(cache.has("fen-b")).toBe(false);
    expect(cache.size).toBe(3);
  });

  it("ignores empty results rather than caching them", async () => {
    const cache = new Map<string, PositionAnalysis>();
    const analyze = vi.fn(async (fen: string) => ({
      fen,
      depth: 0,
      lines: [],
    }));

    await fillMissingWithWasm(cache, ["fen-a"], 18, 3, analyze);
    expect(cache.size).toBe(0);
  });

  it("still accepts a bare progress callback", async () => {
    const onProgress = vi.fn();
    await fillMissingWithWasm(
      new Map(),
      ["fen-a", "fen-b"],
      18,
      3,
      async (fen: string) => analysis(fen),
      onProgress
    );
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenLastCalledWith(2, 2);
  });
});

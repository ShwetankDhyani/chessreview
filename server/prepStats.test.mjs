import { describe, expect, it } from "vitest";
import {
  buildPrepLookupRow,
  normalizePrepLookupPayload,
} from "./prepStats.mjs";

describe("buildPrepLookupRow", () => {
  it("records a solo lookup with cache hit and geo", () => {
    const row = buildPrepLookupRow({
      body: { username: "MagnusCarlsen", platform: "lichess" },
      result: {
        opponent: {
          username: "MagnusCarlsen",
          platform: "lichess",
          sampleSize: 100,
          cache: { hit: true, source: "memory" },
        },
        self: null,
      },
      durationMs: 420,
      geo: { country_code: "NO", region: "Oslo", city: "Oslo" },
      source: "h2h",
    });

    expect(row.username).toBe("MagnusCarlsen");
    expect(row.platform).toBe("lichess");
    expect(row.compare).toBe(false);
    expect(row.compare_skipped).toBe(false);
    expect(row.cache_hit).toBe(true);
    expect(row.sample_size).toBe(100);
    expect(row.duration_ms).toBe(420);
    expect(row.country_code).toBe("NO");
    expect(row.source).toBe("h2h");
  });

  it("records compare mode when self is present", () => {
    const row = buildPrepLookupRow({
      body: {
        username: "Opponent",
        platform: "chesscom",
        selfUsername: "Me",
        selfPlatform: "chesscom",
      },
      result: {
        opponent: {
          username: "Opponent",
          platform: "chesscom",
          sampleSize: 80,
          cache: { hit: false },
        },
        self: {
          username: "Me",
          platform: "chesscom",
          sampleSize: 90,
          cache: { hit: true },
        },
      },
      durationMs: 1200,
    });

    expect(row.compare).toBe(true);
    expect(row.self_username).toBe("Me");
    expect(row.self_cache_hit).toBe(true);
    expect(row.self_sample_size).toBe(90);
  });

  it("marks compare skipped on platform mismatch", () => {
    const row = buildPrepLookupRow({
      body: {
        username: "Opp",
        platform: "lichess",
        selfUsername: "Me",
        selfPlatform: "chesscom",
      },
      result: {
        opponent: {
          username: "Opp",
          platform: "lichess",
          sampleSize: 50,
          cache: { hit: false },
        },
        self: null,
        compareSkipped: {
          reason: "platform_mismatch",
          message: "…",
        },
      },
    });

    expect(row.compare).toBe(false);
    expect(row.compare_skipped).toBe(true);
    expect(row.compare_skip_reason).toBe("platform_mismatch");
  });
});

describe("normalizePrepLookupPayload", () => {
  it("maps camelCase client payload + geo headers", () => {
    const row = normalizePrepLookupPayload(
      {
        username: "Hikaru",
        platform: "chesscom",
        compare: true,
        selfUsername: "Me",
        selfPlatform: "chesscom",
        cacheHit: false,
        durationMs: 900,
        source: "h2h-client",
      },
      { country_code: "US", city: "Austin" }
    );
    expect(row.username).toBe("Hikaru");
    expect(row.compare).toBe(true);
    expect(row.self_username).toBe("Me");
    expect(row.cache_hit).toBe(false);
    expect(row.duration_ms).toBe(900);
    expect(row.country_code).toBe("US");
    expect(row.source).toBe("h2h-client");
  });
});

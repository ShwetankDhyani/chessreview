import { describe, expect, it } from "vitest";
import {
  buildFormReportFromGames,
  categorizeTermination,
  classifyGameFromHeaders,
  computeFormStats,
  computeTpr,
  parsePgnHeaders,
} from "./prepFormStats.mjs";
import { fallbackScoutingReport } from "./prepScouting.mjs";

describe("parsePgnHeaders", () => {
  it("reads standard tag pairs", () => {
    const h = parsePgnHeaders(`[Event "Live"]\n[White "Alice"]\n[Black "Bob"]\n\n1. e4`);
    expect(h.White).toBe("Alice");
    expect(h.Black).toBe("Bob");
  });
});

describe("classifyGameFromHeaders", () => {
  it("scores wins by color from Result", () => {
    const g = classifyGameFromHeaders(
      {
        White: "Alice",
        Black: "Bob",
        Result: "1-0",
        BlackElo: "1500",
        Termination: "Bob resigned",
      },
      "Alice"
    );
    expect(g?.color).toBe("white");
    expect(g?.outcome).toBe("win");
    expect(g?.opponentRating).toBe(1500);
  });
});

describe("computeTpr", () => {
  it("is avg opp when score is 50%", () => {
    expect(computeTpr(1600, 0.5)).toBe(1600);
  });
  it("rises with a winning score", () => {
    expect(computeTpr(1600, 1)).toBe(2000);
  });
});

describe("categorizeTermination", () => {
  it("detects time losses", () => {
    expect(categorizeTermination("White won on time", "loss")).toBe("time");
    expect(categorizeTermination("timeout", "loss")).toBe("time");
  });
  it("detects resignations", () => {
    expect(categorizeTermination("Black resigned", "loss")).toBe("resignation");
  });
});

describe("computeFormStats + tilt", () => {
  it("tracks loss streaks and rapid requeues", () => {
    const base = 1_700_000_000_000;
    const games = [
      {
        color: "white",
        outcome: "loss",
        opponentRating: 1500,
        endMs: base,
        termination: "timeout",
        opening: "",
        result: "0-1",
      },
      {
        color: "black",
        outcome: "loss",
        opponentRating: 1510,
        endMs: base + 20_000,
        termination: "resigned",
        opening: "",
        result: "1-0",
      },
      {
        color: "white",
        outcome: "loss",
        opponentRating: 1490,
        endMs: base + 40_000,
        termination: "mate",
        opening: "",
        result: "0-1",
      },
      {
        color: "black",
        outcome: "win",
        opponentRating: 1520,
        endMs: base + 100_000,
        termination: "",
        opening: "",
        result: "0-1",
      },
    ];
    const stats = computeFormStats(games);
    expect(stats.gamesAnalyzed).toBe(4);
    expect(stats.byColor.overall.wins).toBe(1);
    expect(stats.byColor.overall.losses).toBe(3);
    expect(stats.tilt.longestLossStreak).toBe(3);
    expect(stats.tilt.lossStreaksOf3Plus).toBe(1);
    expect(stats.tilt.rapidRequeuesAfterLoss).toBe(2);
    expect(stats.terminations.timePct).toBeGreaterThan(0);
    expect(stats.tpr.value).not.toBeNull();
    expect(stats.charts.formTrend).toHaveLength(4);
    expect(stats.charts.wld.find((r) => r.key === "wins")?.value).toBe(1);
    expect(stats.charts.terminations.some((r) => r.key === "time")).toBe(true);
  });
});

describe("buildFormReportFromGames", () => {
  it("classifies Chess.com-style list items without engine data", () => {
    const report = buildFormReportFromGames(
      [
        {
          white: "Alice",
          black: "Bob",
          whiteRating: 1600,
          blackRating: 1550,
          whiteResult: "win",
          blackResult: "resigned",
          endTime: 1_700_000_000,
          pgn: `[White "Alice"]\n[Black "Bob"]\n[Result "1-0"]\n`,
        },
        {
          white: "Carol",
          black: "Alice",
          whiteRating: 1580,
          blackRating: 1600,
          whiteResult: "win",
          blackResult: "timeout",
          endTime: 1_700_000_100,
          pgn: "",
        },
      ],
      "Alice"
    );
    expect(report.sampleSize).toBe(2);
    expect(report.stats.byColor.overall.wins).toBe(1);
    expect(report.stats.byColor.overall.losses).toBe(1);
  });
});

describe("fallbackScoutingReport", () => {
  it("returns three-ish sentence prose", () => {
    const report = buildFormReportFromGames(
      [
        {
          white: "Alice",
          black: "Bob",
          whiteRating: 1600,
          blackRating: 1500,
          whiteResult: "win",
          blackResult: "resigned",
          endTime: 100,
          pgn: `[White "Alice"]\n[Black "Bob"]\n[Result "1-0"]\n`,
        },
      ],
      "Alice"
    );
    const text = fallbackScoutingReport(report);
    expect(text.toLowerCase()).toContain("alice");
    expect(text.length).toBeGreaterThan(40);
  });
});

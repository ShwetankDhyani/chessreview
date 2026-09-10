import { describe, expect, it } from "vitest";
import {
  buildFormReportFromGames,
  categorizeTermination,
  classifyGameFromHeaders,
  computeFormStats,
  computeTpr,
  deriveVsRatingArchetype,
  parsePgnHeaders,
  ratingBandForGame,
} from "./prepFormStats.mjs";
import { fallbackFormSummary, buildFormBrief, buildCompareEdgeBrief } from "./prepScouting.mjs";

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
        WhiteElo: "1600",
        BlackElo: "1500",
        Termination: "Bob resigned",
      },
      "Alice"
    );
    expect(g?.color).toBe("white");
    expect(g?.outcome).toBe("win");
    expect(g?.ownRating).toBe(1600);
    expect(g?.opponentRating).toBe(1500);
  });
});

describe("ratingBandForGame + deriveVsRatingArchetype", () => {
  it("only bands much higher / lower (~100 Elo)", () => {
    expect(ratingBandForGame(1600, 1700)).toBe("higher");
    expect(ratingBandForGame(1600, 1500)).toBe("lower");
    expect(ratingBandForGame(1600, 1680)).toBe("peer");
    expect(ratingBandForGame(1600, 1620)).toBe("peer");
    expect(ratingBandForGame(null, 1700)).toBe(null);
  });

  it("allows a thinner contrasting band for loud mismatches", () => {
    expect(
      deriveVsRatingArchetype({
        higher: { played: 8, scorePct: 0 },
        lower: { played: 4, scorePct: 85 },
      }).key
    ).toBe("feasts_lower");
  });

  it("ignores mild near-peer score gaps (not feasting)", () => {
    expect(
      deriveVsRatingArchetype({
        higher: { played: 45, scorePct: 52.2 },
        lower: { played: 25, scorePct: 70 },
      }).key
    ).toBe(null);
  });

  it("labels nerfed gun / giant killer / feasts lower only when extreme", () => {
    expect(
      deriveVsRatingArchetype({
        higher: { played: 20, scorePct: 58 },
        lower: { played: 20, scorePct: 38 },
      }).key
    ).toBe("nerfed_gun");
    expect(
      deriveVsRatingArchetype({
        higher: { played: 20, scorePct: 60 },
        lower: { played: 20, scorePct: 42 },
      }).key
    ).toBe("giant_killer");
    expect(
      deriveVsRatingArchetype({
        higher: { played: 20, scorePct: 30 },
        lower: { played: 20, scorePct: 85 },
      }).key
    ).toBe("feasts_lower");
    expect(
      deriveVsRatingArchetype({
        higher: { played: 20, scorePct: 35 },
        lower: { played: 20, scorePct: 68 },
      }).key
    ).toBe(null);
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

describe("fallbackFormSummary", () => {
  it("returns plain prose", () => {
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
    const text = fallbackFormSummary(report);
    expect(text.toLowerCase()).toContain("alice");
    expect(text.length).toBeGreaterThan(40);
  });
});

describe("buildFormBrief", () => {
  it("returns headline and labeled notes", () => {
    const games = [];
    for (let i = 0; i < 10; i++) {
      const asWhite = i % 2 === 0;
      games.push({
        white: asWhite ? "Alice" : "Bob",
        black: asWhite ? "Bob" : "Alice",
        whiteRating: 1600,
        blackRating: 1500,
        whiteResult: asWhite ? "win" : "resigned",
        blackResult: asWhite ? "resigned" : "win",
        endTime: 1000 + i * 600,
        pgn: `[White "${asWhite ? "Alice" : "Bob"}"]\n[Black "${asWhite ? "Bob" : "Alice"}"]\n[Result "${asWhite ? "1-0" : "0-1"}"]\n`,
      });
    }
    const report = buildFormReportFromGames(games, "Alice");
    const brief = buildFormBrief(report);
    expect(brief.headline.toLowerCase()).toContain("alice");
    expect(brief.notes.length).toBeGreaterThanOrEqual(2);
    expect(brief.notes.some((n) => n.label === "Colors")).toBe(true);
    expect(brief.notes.some((n) => n.label === "Tilt")).toBe(true);
    expect(brief.plain).toContain(brief.headline);
  });

  it("adds a Matchups note for rating-band archetypes", () => {
    const games = [];
    // 10 wins vs higher-rated, 10 losses vs lower-rated → nerfed gun.
    for (let i = 0; i < 10; i++) {
      games.push({
        white: "Alice",
        black: "Strong",
        whiteRating: 1600,
        blackRating: 1750,
        whiteResult: "win",
        blackResult: "resigned",
        endTime: 2000 + i * 60,
        pgn: `[White "Alice"]\n[Black "Strong"]\n[WhiteElo "1600"]\n[BlackElo "1750"]\n[Result "1-0"]\n`,
      });
      games.push({
        white: "Alice",
        black: "Weak",
        whiteRating: 1600,
        blackRating: 1450,
        whiteResult: "resigned",
        blackResult: "win",
        endTime: 3000 + i * 60,
        pgn: `[White "Alice"]\n[Black "Weak"]\n[WhiteElo "1600"]\n[BlackElo "1450"]\n[Result "0-1"]\n`,
      });
    }
    const report = buildFormReportFromGames(games, "Alice");
    expect(report.stats.vsRating?.archetype).toBe("nerfed_gun");
    const brief = buildFormBrief(report);
    const matchups = brief.notes.find((n) => n.label === "Matchups");
    expect(matchups?.body.toLowerCase()).toContain("nerfed gun");
  });
});

describe("buildCompareEdgeBrief", () => {
  it("names who has the edge from score gap", () => {
    const makeGames = (wins) => {
      const games = [];
      for (let i = 0; i < 10; i++) {
        const win = i < wins;
        games.push({
          white: "P",
          black: "Opp",
          whiteRating: 1600,
          blackRating: 1600,
          whiteResult: win ? "win" : "resigned",
          blackResult: win ? "resigned" : "win",
          endTime: 1000 + i * 120,
          pgn: `[White "P"]\n[Black "Opp"]\n[Result "${win ? "1-0" : "0-1"}"]\n`,
        });
      }
      return games;
    };
    const self = buildFormReportFromGames(makeGames(8), "P");
    const opp = buildFormReportFromGames(makeGames(3), "Rival");
    // Rebuild opponent report username
    opp.username = "Rival";
    self.username = "Me";
    const brief = buildCompareEdgeBrief(self, opp);
    expect(brief.headline.toLowerCase()).toContain("edge");
    expect(brief.notes.some((n) => n.label === "Score")).toBe(true);
    expect(brief.plain.toLowerCase()).toContain("rival");
  });
});

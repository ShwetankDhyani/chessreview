import { describe, expect, it } from "vitest";
import { Chess, type Move as ChessMove } from "chess.js";
import {
  classifyMove,
  couldBeBookMove,
  detectVoluntarySacrifice,
  exchangeBalanceAfterMove,
  isEngineTopMove,
  isRecaptureOnSquare,
  qualifiesForBrilliant,
  staticExchangeEval,
} from "./moveClassification";

describe("isRecaptureOnSquare", () => {
  it("detects recapture to same square", () => {
    const prev = {
      captured: "p",
      to: "e5",
      from: "d4",
    } as ChessMove;
    expect(isRecaptureOnSquare([prev], 1, "e5", "f3")).toBe(true);
  });

  it("detects recapture of piece on from-square", () => {
    const prev = {
      captured: "b",
      to: "c3",
      from: "b4",
    } as ChessMove;
    expect(isRecaptureOnSquare([prev], 1, "c3", "c3")).toBe(true);
  });
});

describe("exchangeBalanceAfterMove", () => {
  it("bishop takes bishop with recapture is even", () => {
    const fen = "rnbqkb1r/pppp1ppp/4pn2/8/1b6/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3";
    const c = new Chess(fen);
    const m = c.moves({ verbose: true }).find((x) => x.from === "f1" && x.to === "b4");
    if (!m) return;
    const uci = m.from + m.to;
    const bal = exchangeBalanceAfterMove(fen, uci, "w");
    expect(bal).not.toBeNull();
    expect(bal!).toBeGreaterThanOrEqual(-1);
    expect(detectVoluntarySacrifice(fen, uci, "w", [], 0)).toBe(false);
  });
});

describe("classifyMove", () => {
  const base = {
    isBook: false,
    qualifiesBrilliant: false,
    wpBeforePct: 50,
    wpAfterActualPct: 50,
    isTop: true,
    prevWpForMoverPct: 50,
    hasMateScore: false,
  };

  it("best on tiny epLoss", () => {
    expect(classifyMove({ ...base, epLoss: 0.004 })).toBe("best");
  });

  it("excellent at 1.5% loss", () => {
    expect(classifyMove({ ...base, epLoss: 0.015, isTop: false })).toBe("excellent");
  });

  it("blunder above 20% in a balanced game", () => {
    expect(
      classifyMove({
        ...base,
        epLoss: 0.25,
        isTop: false,
        wpBeforePct: 52,
        wpAfterActualPct: 38,
      })
    ).toBe("blunder");
  });

  it("downgrades throwaway when still comfortably winning", () => {
    expect(
      classifyMove({
        ...base,
        epLoss: 0.25,
        isTop: false,
        wpBeforePct: 92,
        wpAfterActualPct: 78,
      })
    ).toBe("inaccuracy");
    expect(
      classifyMove({
        ...base,
        epLoss: 0.18,
        isTop: false,
        wpBeforePct: 76,
        wpAfterActualPct: 58,
      })
    ).toBe("mistake");
  });

  it("no brilliant without qualifiesBrilliant", () => {
    expect(
      classifyMove({
        ...base,
        epLoss: 0.01,
        qualifiesBrilliant: false,
      })
    ).not.toBe("brilliant");
  });
});

describe("couldBeBookMove", () => {
  it("rejects high epLoss in opening", () => {
    expect(couldBeBookMove(4, false, 0.08, 30, true)).toBe(false);
  });

  it("allows theory-like move", () => {
    expect(couldBeBookMove(4, false, 0.003, 40, true)).toBe(true);
  });
});

describe("isEngineTopMove", () => {
  it("accepts near-zero epLoss without UCI match", () => {
    expect(isEngineTopMove(0.005, "e2e4", "g1f3")).toBe(true);
  });
});

describe("staticExchangeEval", () => {
  it("returns 0 with no attackers", () => {
    const c = new Chess();
    expect(staticExchangeEval(c, "e4", "w")).toBe(0);
  });
});

describe("qualifiesForBrilliant", () => {
  it("rejects when exchange balance is only -1", () => {
    expect(
      qualifiesForBrilliant("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "e2e4", "w", [], 0, -1)
    ).toBe(false);
  });
});

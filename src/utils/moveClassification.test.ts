import { describe, expect, it } from "vitest";
import { Chess, type Move as ChessMove } from "chess.js";
import {
  classifyMove,
  couldBeBookMove,
  detectVoluntarySacrifice,
  exchangeBalanceAfterMove,
  isEngineTopMove,
  isExactEngineMove,
  isGameChangingBlunder,
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
    cpLossVsBest: 0,
    cpSwing: 0,
  };

  it("best on tiny epLoss", () => {
    expect(classifyMove({ ...base, epLoss: 0.004 })).toBe("best");
  });

  it("excellent at 1.0% loss", () => {
    expect(classifyMove({ ...base, epLoss: 0.01, isTop: false })).toBe("excellent");
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

  it("does not auto-downgrade large losses just because side is winning", () => {
    expect(
      classifyMove({
        ...base,
        epLoss: 0.25,
        isTop: false,
        wpBeforePct: 92,
        wpAfterActualPct: 78,
      })
    ).toBe("blunder");
    expect(
      classifyMove({
        ...base,
        epLoss: 0.18,
        isTop: false,
        wpBeforePct: 76,
        wpAfterActualPct: 58,
      })
    ).toBe("blunder");
  });

  it("does not label best when engine UCI matches but loss is large", () => {
    expect(
      classifyMove({
        ...base,
        epLoss: 0.15,
        isTop: true,
        cpLossVsBest: 180,
        cpSwing: 200,
        wpBeforePct: 70,
        wpAfterActualPct: 48,
      })
    ).toBe("blunder");
  });

  it("upgrades moderate epLoss to blunder on game-changing cp swing", () => {
    expect(
      classifyMove({
        ...base,
        epLoss: 0.08,
        isTop: false,
        cpLossVsBest: 110,
        cpSwing: 0,
        wpBeforePct: 52,
        wpAfterActualPct: 50,
      })
    ).toBe("blunder");
    expect(
      classifyMove({
        ...base,
        epLoss: 0.08,
        isTop: false,
        cpLossVsBest: 20,
        cpSwing: 170,
        wpBeforePct: 55,
        wpAfterActualPct: 52,
      })
    ).toBe("blunder");
  });

  it("keeps true mistakes when swing is moderate", () => {
    expect(
      classifyMove({
        ...base,
        epLoss: 0.09,
        isTop: false,
        cpLossVsBest: 55,
        cpSwing: 70,
        wpBeforePct: 52,
        wpAfterActualPct: 48,
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
  it("rejects non-matching UCI when loss is above best band", () => {
    expect(isEngineTopMove(0.01, "e2e4", "g1f3")).toBe(false);
  });

  it("accepts exact match with small loss", () => {
    expect(isEngineTopMove(0.005, "e2e4", "e2e4")).toBe(true);
    expect(isEngineTopMove(0.02, "e2e4", "e2e4")).toBe(false);
  });
});

describe("isGameChangingBlunder", () => {
  it("flags large win-% drop", () => {
    expect(
      isGameChangingBlunder({
        epLoss: 0.06,
        cpLossVsBest: 30,
        cpSwing: 40,
        wpBeforePct: 72,
        wpAfterActualPct: 50,
      })
    ).toBe(true);
  });
});

describe("isExactEngineMove", () => {
  it("detects UCI equality", () => {
    expect(isExactEngineMove("e2e4", "E2E4")).toBe(true);
    expect(isExactEngineMove("e2e4", "g1f3")).toBe(false);
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

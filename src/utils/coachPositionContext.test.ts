import { describe, expect, it } from "vitest";
import type { AnalyzedMove } from "../types";
import {
  getPositionAwareMoveComment,
  getPositionOutlook,
  playerCp,
} from "./coachPositionContext";

function move(partial: Partial<AnalyzedMove> & Pick<AnalyzedMove, "san" | "classification">): AnalyzedMove {
  return {
    moveNumber: 10,
    color: "w",
    fenAfter: "",
    uci: "e2e4",
    bestMove: "e2e4",
    deltaE: 0,
    ...partial,
  } as AnalyzedMove;
}

describe("playerCp", () => {
  it("flips eval for black", () => {
    const m = move({
      san: "Nf6",
      classification: "best",
      color: "b",
      evalAfter: { cp: 200 },
    });
    expect(playerCp(m, "after")).toBe(-200);
  });
});

describe("getPositionAwareMoveComment", () => {
  it("praises brilliance but notes lateness when still losing", () => {
    const m = move({
      san: "Qh7+",
      classification: "brilliant",
      color: "w",
      evalBefore: { cp: -500 },
      evalAfter: { cp: -450 },
      isSacrifice: true,
    });
    expect(getPositionOutlook(m, "before")).toBe("desperate");
    const text = getPositionAwareMoveComment(m, 3);
    expect(text).toMatch(/late|already|still losing|long shot|clock|wish|scoreboard|ago|against you/i);
  });

  it("does not cheer a blunder when already lost", () => {
    const m = move({
      san: "Ke2",
      classification: "blunder",
      color: "w",
      evalBefore: { cp: -600 },
      evalAfter: { cp: -900 },
      deltaE: -3,
      bestMoveSan: "Kd1",
    });
    const text = getPositionAwareMoveComment(m, 5);
    expect(text).toMatch(/already|grim|seals|little left|sugarcoat/i);
    expect(text).not.toMatch(/great job|keep fighting|you got this/i);
  });

  it("notes throwing away a win when blundering from ahead", () => {
    const m = move({
      san: "Qf2",
      classification: "blunder",
      color: "w",
      evalBefore: { cp: 500 },
      evalAfter: { cp: 100 },
      deltaE: -4,
    });
    const text = getPositionAwareMoveComment(m, 7);
    expect(text).toMatch(/winning|comfortable|let them back|throws away/i);
  });
});

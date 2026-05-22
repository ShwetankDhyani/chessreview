import { describe, expect, it } from "vitest";
import type { AnalyzedMove } from "../types";
import {
  keyMomentNavState,
  listKeyMomentIndices,
} from "./keyMomentNav";

function classified(
  entries: Array<[string, AnalyzedMove["classification"]]>
): AnalyzedMove[] {
  return entries.map(([san, classification], i) => ({
    san,
    classification,
    moveNumber: Math.floor(i / 2) + 1,
    color: i % 2 === 0 ? "w" : "b",
    fenAfter: "",
    uci: "e2e4",
    bestMove: "e2e4",
    deltaE: 0,
  })) as AnalyzedMove[];
}

describe("listKeyMomentIndices", () => {
  it("includes brilliant, great, mistake, blunder only", () => {
    const moves = classified([
      ["e4", "book"],
      ["e5", "best"],
      ["Nf3", "mistake"],
      ["Nc6", "good"],
      ["Bb5", "brilliant"],
      ["a6", "inaccuracy"],
    ]);
    expect(listKeyMomentIndices(moves)).toEqual([2, 4]);
  });
});

describe("keyMomentNavState", () => {
  it("finds earlier and later highlights", () => {
    const indices = [2, 5, 9];
    expect(keyMomentNavState(indices, 0)).toEqual({
      prev: undefined,
      next: 2,
      position: null,
      total: 3,
    });
    expect(keyMomentNavState(indices, 5)).toEqual({
      prev: 2,
      next: 9,
      position: 2,
      total: 3,
    });
    expect(keyMomentNavState(indices, 10)).toEqual({
      prev: 9,
      next: undefined,
      position: null,
      total: 3,
    });
  });
});

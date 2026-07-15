import { describe, expect, it } from "vitest";
import {
  formatOpeningEcoLabel,
  matchOpeningEco,
  type OpeningEcoEntry,
} from "./openingEcoLookup";

const SAMPLE: OpeningEcoEntry[] = [
  {
    eco: "B20",
    name: "Sicilian Defense",
    moves: ["e4", "c5"],
  },
  {
    eco: "B90",
    name: "Sicilian Defense: Najdorf Variation",
    moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"],
  },
  {
    eco: "B90",
    name: "Sicilian Defense: Najdorf Variation, English Attack",
    moves: [
      "e4",
      "c5",
      "Nf3",
      "d6",
      "d4",
      "cxd4",
      "Nxd4",
      "Nf6",
      "Nc3",
      "a6",
      "Be3",
    ],
  },
];

describe("openingEcoLookup", () => {
  it("picks the deepest matching variation", () => {
    const sans = [
      "e4",
      "c5",
      "Nf3",
      "d6",
      "d4",
      "cxd4",
      "Nxd4",
      "Nf6",
      "Nc3",
      "a6",
      "Be3",
    ];
    const match = matchOpeningEco(sans, SAMPLE);
    expect(match?.name).toBe(
      "Sicilian Defense: Najdorf Variation, English Attack"
    );
    expect(match?.eco).toBe("B90");
    expect(match?.plyCount).toBe(11);
  });

  it("falls back to shorter named lines", () => {
    const match = matchOpeningEco(["e4", "c5", "Nf3"], SAMPLE);
    expect(match?.name).toBe("Sicilian Defense");
  });

  it("formats eco label for coach display", () => {
    expect(
      formatOpeningEcoLabel({
        eco: "B90",
        name: "Sicilian Defense: Najdorf Variation, English Attack",
        plyCount: 11,
      })
    ).toBe("B90 · Sicilian Defense: Najdorf Variation, English Attack");
  });
});

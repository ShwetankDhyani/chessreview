import { describe, expect, it } from "vitest";
import { buildPgnFilename } from "./exportPgn";

describe("buildPgnFilename", () => {
  it("builds a safe filename from player names", () => {
    expect(buildPgnFilename("Magnus Carlsen", "Hikaru Nakamura")).toBe(
      "Magnus_Carlsen_vs_Hikaru_Nakamura.pgn"
    );
  });

  it("falls back when names are empty", () => {
    expect(buildPgnFilename("", "")).toBe("player_vs_player.pgn");
  });
});

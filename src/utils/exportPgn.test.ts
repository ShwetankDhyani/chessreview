import { describe, expect, it, vi } from "vitest";
import { buildPgnFilename, copyPgnToClipboard } from "./exportPgn";

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

describe("copyPgnToClipboard", () => {
  it("writes trimmed PGN via the clipboard API", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    await expect(copyPgnToClipboard("  1. e4 e5 *  ")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("1. e4 e5 *");
  });

  it("returns false for empty PGN", async () => {
    await expect(copyPgnToClipboard("   ")).resolves.toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { chessProfileUrl, platformLabel } from "./reviewStats";

describe("chessProfileUrl", () => {
  it("builds Chess.com member links", () => {
    expect(chessProfileUrl("chesscom", "ShwetankDhyani")).toBe(
      "https://www.chess.com/member/ShwetankDhyani"
    );
  });

  it("builds Lichess profile links", () => {
    expect(chessProfileUrl("lichess", "DrNykterstein")).toBe(
      "https://lichess.org/@/DrNykterstein"
    );
  });

  it("returns null without username or unknown platform", () => {
    expect(chessProfileUrl("chesscom", null)).toBeNull();
    expect(chessProfileUrl("other", "x")).toBeNull();
  });
});

describe("platformLabel", () => {
  it("pretty-prints known platforms", () => {
    expect(platformLabel("chesscom")).toBe("Chess.com");
    expect(platformLabel("lichess")).toBe("Lichess");
  });
});

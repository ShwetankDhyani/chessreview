import { describe, expect, it } from "vitest";
import { parseGameUrl } from "./gameUrlImport";

describe("parseGameUrl", () => {
  it("parses lichess game links", () => {
    expect(parseGameUrl("https://lichess.org/abcdef12")?.platform).toBe("lichess");
    expect(parseGameUrl("https://lichess.org/game/AbCdEf12")?.gameId).toBe("AbCdEf12");
  });

  it("parses chess.com live and analysis links", () => {
    const live = parseGameUrl("https://www.chess.com/game/live/2485075845");
    expect(live?.platform).toBe("chesscom");
    expect(live?.gameId).toBe("2485075845");
    expect(live?.gameType).toBe("live");

    const analysis = parseGameUrl(
      "https://www.chess.com/analysis/game/daily/999"
    );
    expect(analysis?.gameType).toBe("daily");
  });

  it("rejects profile URLs", () => {
    expect(parseGameUrl("https://www.chess.com/member/Hikaru")).toBeNull();
  });
});

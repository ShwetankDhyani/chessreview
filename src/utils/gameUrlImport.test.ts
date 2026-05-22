import { describe, expect, it } from "vitest";
import { parseGameUrl } from "./gameUrlImport";
import { getUrlHost, isSupportedGameHost } from "./gameUrlHosts";

describe("parseGameUrl", () => {
  it("parses lichess game links", () => {
    expect(parseGameUrl("https://lichess.org/abcdef12")?.platform).toBe("lichess");
    expect(parseGameUrl("https://lichess.org/game/AbCdEf12")?.gameId).toBe("AbCdEf12");
    expect(parseGameUrl("https://lichess.org/AbCdEf12/black")?.gameId).toBe("AbCdEf12");
    expect(parseGameUrl("https://www.lichess.org/AbCdEf12")?.gameId).toBe("AbCdEf12");
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

  it("rejects profile and unsupported hosts", () => {
    expect(parseGameUrl("https://www.chess.com/member/Hikaru")).toBeNull();
    expect(parseGameUrl("https://google.com/foo")).toBeNull();
    expect(isSupportedGameHost(getUrlHost("https://google.com"))).toBe(false);
    expect(isSupportedGameHost(getUrlHost("https://lichess.org/x"))).toBe(true);
  });
});

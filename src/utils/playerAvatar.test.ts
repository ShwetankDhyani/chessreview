import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isFetchableUsername,
  detectPlatformFromPgn,
  fetchPlayerAvatar,
  resetPlayerAvatarCacheForTests,
} from "./playerAvatar";
import { resetSafeStorageForTests, safeGetJson } from "./safeStorage";

describe("playerAvatar", () => {
  beforeEach(() => {
    resetSafeStorageForTests();
    resetPlayerAvatarCacheForTests();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("isFetchableUsername", () => {
    it("accepts valid usernames", () => {
      expect(isFetchableUsername("hikaru")).toBe(true);
      expect(isFetchableUsername("MagnusCarlsen")).toBe(true);
      expect(isFetchableUsername("dr_nykterstein")).toBe(true);
      expect(isFetchableUsername("test-player")).toBe(true);
    });

    it("rejects generic or bot labels", () => {
      expect(isFetchableUsername("White")).toBe(false);
      expect(isFetchableUsername("black")).toBe(false);
      expect(isFetchableUsername("Anonymous")).toBe(false);
      expect(isFetchableUsername("Computer")).toBe(false);
      expect(isFetchableUsername("Stockfish 16")).toBe(false);
      expect(isFetchableUsername("Opponent")).toBe(false);
    });

    it("rejects names with spaces or empty strings", () => {
      expect(isFetchableUsername("")).toBe(false);
      expect(isFetchableUsername("   ")).toBe(false);
      expect(isFetchableUsername("Carlsen Magnus")).toBe(false);
      expect(isFetchableUsername("a")).toBe(false); // too short
    });
  });

  describe("detectPlatformFromPgn", () => {
    it("detects chesscom", () => {
      const pgn = `[Event "Live Chess"]\n[Site "Chess.com"]\n[White "player1"]\n[Black "player2"]`;
      expect(detectPlatformFromPgn(pgn)).toBe("chesscom");
    });

    it("detects lichess", () => {
      const pgn = `[Event "Rated Blitz game"]\n[Site "https://lichess.org/abc12345"]`;
      expect(detectPlatformFromPgn(pgn)).toBe("lichess");
    });

    it("returns null when no platform marker exists", () => {
      const pgn = `[Event "Casual game"]\n[White "Alice"]\n[Black "Bob"]`;
      expect(detectPlatformFromPgn(pgn)).toBeNull();
      expect(detectPlatformFromPgn(null)).toBeNull();
    });
  });

  describe("fetchPlayerAvatar", () => {
    it("returns null for non-fetchable names immediately without network call", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const res = await fetchPlayerAvatar("White");
      expect(res).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("fetches and caches Chess.com avatar", async () => {
      const mockAvatar = "https://images.chesscomfiles.com/uploads/v1/user/123.png";
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ avatar: mockAvatar, username: "hikaru" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const res1 = await fetchPlayerAvatar("hikaru", "chesscom");
      expect(res1).toBe(mockAvatar);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Second call should hit in-memory cache without refetching
      const res2 = await fetchPlayerAvatar("hikaru", "chesscom");
      expect(res2).toBe(mockAvatar);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("fetches and formats Lichess flair", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ flair: "nature.seedling", id: "thibault" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const res = await fetchPlayerAvatar("thibault", "lichess");
      expect(res).toBe("https://lichess1.org/assets/______4/flair/img/nature.seedling.webp");
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("deduplicates simultaneous in-flight requests", async () => {
      const mockAvatar = "https://images.chesscomfiles.com/avatar.png";
      let resolveFetch!: (res: Response) => void;
      const fetchPromise = new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockReturnValue(fetchPromise);

      const p1 = fetchPlayerAvatar("magnus", "chesscom");
      const p2 = fetchPlayerAvatar("magnus", "chesscom");

      resolveFetch(
        new Response(JSON.stringify({ avatar: mockAvatar }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toBe(mockAvatar);
      expect(r2).toBe(mockAvatar);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("does not persist null to safeStorage when avatar is not found", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({}), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      );

      const res = await fetchPlayerAvatar("unknownplayer", "chesscom");
      expect(res).toBeNull();

      // Check safeStorage was not polluted with a long TTL null entry
      const rawStored = safeGetJson("chess_avatar_v1:chesscom:unknownplayer", null);
      expect(rawStored).toBeNull();
    });

    it("falls back to Lichess if Chess.com player has no avatar", async () => {
      const mockLichessFlair = "nature.seedling";
      vi.spyOn(globalThis, "fetch").mockImplementation(async (info) => {
        const url = String(info);
        if (url.includes("api.chess.com")) {
          return new Response(JSON.stringify({ username: "playerx" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("lichess.org")) {
          return new Response(JSON.stringify({ flair: mockLichessFlair, id: "playerx" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(null, { status: 404 });
      });

      const res = await fetchPlayerAvatar("playerx", "chesscom");
      expect(res).toBe("https://lichess1.org/assets/______4/flair/img/nature.seedling.webp");
    });
  });
});


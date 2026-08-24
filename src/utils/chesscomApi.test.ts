import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchRecentGames } from "./chesscomApi";
import { HttpStatusError, NotFoundError } from "./netRetry";

const USER = "testplayer";
const ARCHIVES_URL = `https://api.chess.com/pub/player/${USER}/games/archives`;

function game(endTime: number) {
  return {
    rules: "chess",
    pgn: `[Event "Test"]\n\n1. e4 e5`,
    end_time: endTime,
    time_class: "blitz",
    white: { username: "a", rating: 1500, result: "win" },
    black: { username: "b", rating: 1490, result: "checkmated" },
  };
}

function jsonOk(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function status(code: number) {
  return new Response("", { status: code });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchRecentGames", () => {
  it("collects games from recent archive months, newest first", async () => {
    const m1 = `https://api.chess.com/pub/player/${USER}/games/2026/07`;
    const m2 = `https://api.chess.com/pub/player/${USER}/games/2026/08`;

    fetchMock.mockImplementation((url: string) => {
      if (url === ARCHIVES_URL) return Promise.resolve(jsonOk({ archives: [m1, m2] }));
      if (url === m2) return Promise.resolve(jsonOk({ games: [game(2000)] }));
      if (url === m1) return Promise.resolve(jsonOk({ games: [game(1000)] }));
      return Promise.resolve(status(404));
    });

    const games = await fetchRecentGames(USER);
    expect(games).toHaveLength(2);
    expect(games[0].endTime).toBe(2000);
    expect(games[1].endTime).toBe(1000);
  });

  it("throws NotFoundError when the account does not exist", async () => {
    fetchMock.mockResolvedValue(status(404));
    await expect(fetchRecentGames(USER)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws instead of reporting an empty list when every month fails", async () => {
    // Regression guard: month failures were skipped silently, so an upstream
    // outage looked identical to "this account has no games".
    const m1 = `https://api.chess.com/pub/player/${USER}/games/2026/07`;
    const m2 = `https://api.chess.com/pub/player/${USER}/games/2026/08`;

    fetchMock.mockImplementation((url: string) => {
      if (url === ARCHIVES_URL) return Promise.resolve(jsonOk({ archives: [m1, m2] }));
      return Promise.resolve(status(500));
    });

    const err = await fetchRecentGames(USER, { timeoutMs: 2_000 }).catch((e) => e);
    expect(err).toBeInstanceOf(HttpStatusError);
    expect((err as HttpStatusError).status).toBe(500);
  });

  it("tolerates a partial outage when at least one month succeeds", async () => {
    const good = `https://api.chess.com/pub/player/${USER}/games/2026/08`;
    const bad = `https://api.chess.com/pub/player/${USER}/games/2026/07`;

    fetchMock.mockImplementation((url: string) => {
      if (url === ARCHIVES_URL) return Promise.resolve(jsonOk({ archives: [bad, good] }));
      if (url === good) return Promise.resolve(jsonOk({ games: [game(3000)] }));
      return Promise.resolve(status(500));
    });

    const games = await fetchRecentGames(USER, { timeoutMs: 3_000 });
    expect(games).toHaveLength(1);
    expect(games[0].endTime).toBe(3000);
  });

  it("returns an empty list for an account with archives but no games", async () => {
    const m = `https://api.chess.com/pub/player/${USER}/games/2026/08`;
    fetchMock.mockImplementation((url: string) => {
      if (url === ARCHIVES_URL) return Promise.resolve(jsonOk({ archives: [m] }));
      if (url === m) return Promise.resolve(jsonOk({ games: [] }));
      return Promise.resolve(status(404));
    });

    await expect(fetchRecentGames(USER)).resolves.toEqual([]);
  });

  it("treats a missing month archive as empty rather than an error", async () => {
    const m = `https://api.chess.com/pub/player/${USER}/games/2026/08`;
    fetchMock.mockImplementation((url: string) => {
      if (url === ARCHIVES_URL) return Promise.resolve(jsonOk({ archives: [m] }));
      return Promise.resolve(status(410));
    });

    await expect(fetchRecentGames(USER)).resolves.toEqual([]);
  });

  it("honours caller cancellation", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError"))
        );
      });
    });

    const pending = fetchRecentGames(USER, { signal: controller.signal });
    controller.abort();

    const err = await pending.catch((e) => e);
    expect((err as Error).name).toBe("AbortError");
  });

  it("still accepts a bare numeric limit argument", async () => {
    const m = `https://api.chess.com/pub/player/${USER}/games/2026/08`;
    fetchMock.mockImplementation((url: string) => {
      if (url === ARCHIVES_URL) return Promise.resolve(jsonOk({ archives: [m] }));
      return Promise.resolve(jsonOk({ games: [game(1), game(2), game(3)] }));
    });

    const games = await fetchRecentGames(USER, 2);
    expect(games).toHaveLength(2);
  });
});

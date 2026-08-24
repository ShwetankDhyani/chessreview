import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLichessGames, fetchLichessPlayerStats } from "./lichessApi";
import { HttpStatusError, NotFoundError } from "./netRetry";

function ndjsonGame(id: string, lastMoveAt: number) {
  return JSON.stringify({
    id,
    rated: true,
    speed: "blitz",
    createdAt: lastMoveAt - 1000,
    lastMoveAt,
    status: "mate",
    pgn: `[Event "Test"]\n\n1. e4 e5`,
    players: {
      white: { user: { name: "alice" }, rating: 1600 },
      black: { user: { name: "bob" }, rating: 1580 },
    },
    winner: "white",
  });
}

function ndjsonResponse(lines: string[], init: ResponseInit = {}) {
  return new Response(lines.join("\n"), {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson" },
    ...init,
  });
}

function status(code: number, headers: Record<string, string> = {}) {
  return new Response("", { status: code, headers });
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

describe("fetchLichessGames", () => {
  it("parses NDJSON into game list items", async () => {
    fetchMock.mockResolvedValue(
      ndjsonResponse([ndjsonGame("aaa", 2_000_000), ndjsonGame("bbb", 1_000_000)])
    );

    const games = await fetchLichessGames("Alice");
    expect(games).toHaveLength(2);
    expect(games[0].white).toBe("alice");
    expect(games[0].whiteResult).toBe("win");
    expect(games[0].endTime).toBe(2000);
  });

  it("lowercases the username so games, profile and stats agree", async () => {
    fetchMock.mockResolvedValue(ndjsonResponse([ndjsonGame("aaa", 1000)]));
    await fetchLichessGames("MiXeDCase");
    expect(String(fetchMock.mock.calls[0][0])).toContain("/games/user/mixedcase");
  });

  it("keeps the games it did parse when the stream is truncated", async () => {
    // A dropped connection used to discard the entire response.
    fetchMock.mockResolvedValue(
      ndjsonResponse([ndjsonGame("aaa", 3000), '{"id":"partial","pla']) 
    );

    const games = await fetchLichessGames("alice");
    expect(games).toHaveLength(1);
    expect(games[0].id).toContain("aaa");
  });

  it("skips games that carry no PGN", async () => {
    const noPgn = JSON.stringify({
      id: "nopgn",
      rated: true,
      speed: "blitz",
      createdAt: 1,
      lastMoveAt: 2000,
      status: "mate",
      players: { white: {}, black: {} },
    });
    fetchMock.mockResolvedValue(ndjsonResponse([noPgn, ndjsonGame("ok", 3000)]));

    const games = await fetchLichessGames("alice");
    expect(games).toHaveLength(1);
  });

  it("throws NotFoundError for 404", async () => {
    fetchMock.mockResolvedValue(status(404));
    await expect(fetchLichessGames("ghost")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError for 400 (malformed username)", async () => {
    fetchMock.mockResolvedValue(status(400));
    await expect(fetchLichessGames("!!")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("retries a rate limit and succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(status(429, { "Retry-After": "0" }))
      .mockResolvedValueOnce(ndjsonResponse([ndjsonGame("aaa", 1000)]));

    const games = await fetchLichessGames("alice");
    expect(games).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports a typed status error when rate limiting persists", async () => {
    fetchMock.mockResolvedValue(status(429, { "Retry-After": "0" }));
    const err = await fetchLichessGames("alice", { timeoutMs: 1_500 }).catch((e) => e);
    expect(err).toBeInstanceOf(HttpStatusError);
    expect((err as HttpStatusError).status).toBe(429);
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

    const pending = fetchLichessGames("alice", { signal: controller.signal });
    controller.abort();

    const err = await pending.catch((e) => e);
    expect((err as Error).name).toBe("AbortError");
  });
});

describe("fetchLichessPlayerStats", () => {
  it("maps perf ratings", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          perfs: {
            bullet: { rating: 1700 },
            blitz: { rating: 1650 },
            rapid: { rating: 1720 },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const stats = await fetchLichessPlayerStats("alice");
    expect(stats).toEqual({ bullet: 1700, blitz: 1650, rapid: 1720 });
  });

  it("throws NotFoundError for a missing account", async () => {
    fetchMock.mockResolvedValue(status(404));
    await expect(fetchLichessPlayerStats("ghost")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});

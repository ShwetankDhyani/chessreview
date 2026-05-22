/**
 * Server-side game URL import (no browser CORS).
 * Used by Vercel /api/game-import and Vite dev middleware.
 */

const USER_AGENT = "ChessReviewApp/1.0";

export function parseGameUrl(input) {
  const raw = input.trim();
  let url;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "lichess.org") {
    const m = url.pathname.match(
      /^(?:\/embed)?\/(?:game\/)?([a-zA-Z0-9]{8})(?:\/.*)?$/
    );
    if (m) return { platform: "lichess", gameId: m[1] };
    return null;
  }

  if (host === "chess.com") {
    const m = url.pathname.match(/\/game\/(live|daily)\/(\d+)/i);
    if (m) {
      return {
        platform: "chesscom",
        gameId: m[2],
        gameType: m[1].toLowerCase(),
      };
    }
    const analysis = url.pathname.match(
      /\/analysis\/game\/(live|daily)\/(\d+)/i
    );
    if (analysis) {
      return {
        platform: "chesscom",
        gameId: analysis[2],
        gameType: analysis[1].toLowerCase(),
      };
    }
  }

  return null;
}

async function fetchLichessPgn(gameId) {
  const headers = { "User-Agent": USER_AGENT };

  const jsonRes = await fetch(
    `https://lichess.org/game/export/${encodeURIComponent(gameId)}?pgnInJson=true`,
    { headers: { ...headers, Accept: "application/vnd.lichess.v3+json" } }
  );
  if (jsonRes.ok) {
    const text = (await jsonRes.text()).trim();
    if (text.startsWith("{")) {
      const row = JSON.parse(text);
      if (row.pgn?.trim()) return row.pgn.trim();
    }
    if (text.includes("[Event")) return text;
  }

  const pgnRes = await fetch(
    `https://lichess.org/game/export/${encodeURIComponent(gameId)}`,
    { headers: { ...headers, Accept: "application/x-chess-pgn" } }
  );
  if (pgnRes.ok) {
    const text = (await pgnRes.text()).trim();
    if (text.includes("[Event")) return text;
  }

  const postRes = await fetch("https://lichess.org/api/games/export/_ids", {
    method: "POST",
    headers: {
      ...headers,
      Accept: "application/x-ndjson",
      "Content-Type": "text/plain",
    },
    body: gameId,
  });
  if (postRes.ok) {
    const line = (await postRes.text()).trim().split("\n")[0];
    if (line.startsWith("{")) {
      const row = JSON.parse(line);
      if (row.pgn?.trim()) return row.pgn.trim();
    }
  }

  throw new Error(
    "Lichess game not found — use a finished game link (8-character ID)."
  );
}

async function fetchChessComMonth(username, year, month) {
  const mm = String(month).padStart(2, "0");
  const res = await fetch(
    `https://api.chess.com/pub/player/${username.toLowerCase()}/games/${year}/${mm}`,
    { headers: { "User-Agent": USER_AGENT } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.games ?? [])
    .filter((g) => g.rules === "chess" && g.pgn)
    .map((g) => ({
      pgn: g.pgn,
      white: g.white.username,
      black: g.black.username,
      endTime: g.end_time,
    }));
}

async function fetchChessComMeta(gameId, gameType) {
  const path = gameType === "daily" ? "daily" : "live";
  const res = await fetch(
    `https://www.chess.com/callback/${path}/game/${gameId}`,
    { headers: { "User-Agent": USER_AGENT } }
  );
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? "Chess.com game not found."
        : `Chess.com lookup failed (${res.status})`
    );
  }
  const data = await res.json();
  if (!data.game?.pgnHeaders?.White || !data.game.pgnHeaders.Black) {
    throw new Error("Chess.com did not return player names for this game.");
  }
  return data.game;
}

async function findChessComPgn(white, black, endTime) {
  const d = new Date(endTime * 1000);
  const months = [];
  for (let i = 0; i < 6; i++) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
    months.push({ y: dt.getFullYear(), m: dt.getMonth() + 1 });
  }

  for (const { y, m } of months) {
    for (const player of [white, black]) {
      const games = await fetchChessComMonth(player, y, m);
      const hit = games.find(
        (g) =>
          g.white.toLowerCase() === white.toLowerCase() &&
          g.black.toLowerCase() === black.toLowerCase() &&
          Math.abs(g.endTime - endTime) <= 300
      );
      if (hit?.pgn) return hit.pgn;
    }
  }

  throw new Error(
    "Chess.com game is not in the public archive yet. Open the game → Share → Copy PGN, then paste below."
  );
}

async function fetchChessComPgn(gameId, gameType) {
  const meta = await fetchChessComMeta(gameId, gameType);
  if (!meta.endTime || !meta.pgnHeaders?.White || !meta.pgnHeaders.Black) {
    throw new Error("Incomplete Chess.com game metadata.");
  }
  return findChessComPgn(
    meta.pgnHeaders.White,
    meta.pgnHeaders.Black,
    meta.endTime
  );
}

export async function fetchPgnFromGameUrl(input) {
  const parsed = parseGameUrl(input);
  if (!parsed) {
    throw new Error(
      "Paste a Chess.com or Lichess game link (e.g. chess.com/game/live/… or lichess.org/abcdefgh)."
    );
  }

  if (parsed.platform === "lichess") {
    const pgn = await fetchLichessPgn(parsed.gameId);
    return { pgn, label: `Lichess ${parsed.gameId}` };
  }

  const pgn = await fetchChessComPgn(
    parsed.gameId,
    parsed.gameType ?? "live"
  );
  return { pgn, label: `Chess.com #${parsed.gameId}` };
}

/** Vite dev server middleware */
export function createGameImportMiddleware() {
  return async (req, res, next) => {
    if (!req.url?.startsWith("/api/game-import")) return next();

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.end();
      return;
    }

    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "POST only" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      try {
        const { url } = JSON.parse(body);
        if (!url || typeof url !== "string") {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "Missing url" }));
          return;
        }
        const result = await fetchPgnFromGameUrl(url);
        res.statusCode = 200;
        res.end(JSON.stringify(result));
      } catch (e) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            error: e instanceof Error ? e.message : "Import failed",
          })
        );
      }
    });
  };
}

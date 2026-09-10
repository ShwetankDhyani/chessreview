/**
 * Fetch last N public games for prep form (server-side, rate-limit aware).
 */

import { chesscomFetch, CHESSCOM_USER_AGENT } from "./chesscomClient.mjs";

const DEFAULT_LIMIT = 100;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithLichessBackoff(url, init, retries = 3) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(25_000),
      });
      if (res.status === 429 && attempt < retries) {
        const ra = res.headers.get("Retry-After");
        const wait = ra && Number(ra) ? Number(ra) * 1000 : 2000 * (attempt + 1);
        await sleep(Math.min(20_000, wait));
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      if (attempt >= retries) throw e;
      await sleep(1000 * (attempt + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Lichess fetch failed");
}

/**
 * @param {string} username
 * @param {number} [limit]
 */
export async function fetchLichessRecentGames(username, limit = DEFAULT_LIMIT) {
  const max = Math.min(100, Math.max(1, limit | 0));
  const url = `https://lichess.org/api/games/user/${encodeURIComponent(
    username.trim()
  )}?max=${max}&pgnInJson=true&clocks=false&evals=false&opening=true&perfType=bullet,blitz,rapid,classical`;

  const res = await fetchWithLichessBackoff(url, {
    headers: {
      Accept: "application/x-ndjson",
      "User-Agent": CHESSCOM_USER_AGENT,
    },
  });

  if (res.status === 404 || res.status === 400) {
    throw new Error(`Player "${username}" not found on Lichess`);
  }
  if (!res.ok) {
    throw new Error(`Lichess API error: ${res.status}`);
  }

  const text = await res.text();
  const lines = text.split("\n").filter((l) => l.trim());
  const games = [];
  for (const line of lines) {
    try {
      const g = JSON.parse(line);
      if (!g?.pgn) continue;
      const wName = g.players?.white?.user?.name ?? "?";
      const bName = g.players?.black?.user?.name ?? "?";
      let whiteResult = "unknown";
      let blackResult = "unknown";
      if (g.winner === "white") {
        whiteResult = "win";
        blackResult = g.status === "timeout" ? "timeout" : "checkmated";
      } else if (g.winner === "black") {
        blackResult = "win";
        whiteResult = g.status === "timeout" ? "timeout" : "checkmated";
      } else if (!g.winner && g.status !== "aborted") {
        whiteResult = "draw";
        blackResult = "draw";
      }
      games.push({
        id: g.id,
        pgn: g.pgn,
        white: wName,
        black: bName,
        whiteRating: g.players?.white?.rating ?? 0,
        blackRating: g.players?.black?.rating ?? 0,
        whiteResult,
        blackResult,
        timeClass: g.speed,
        endTime: Math.floor((g.lastMoveAt || g.createdAt || 0) / 1000),
        termination: g.status || "",
        opening: g.opening?.name || "",
      });
    } catch {
      /* skip corrupt NDJSON lines */
    }
  }
  return games.slice(0, max);
}

function mapChesscomGames(rawGames) {
  return (rawGames || [])
    .filter((g) => g.rules === "chess" && g.pgn)
    .sort((a, b) => (b.end_time || 0) - (a.end_time || 0))
    .map((g, idx) => ({
      id: `${g.end_time}_${idx}`,
      pgn: g.pgn,
      white: g.white?.username,
      black: g.black?.username,
      whiteRating: g.white?.rating,
      blackRating: g.black?.rating,
      whiteResult: g.white?.result,
      blackResult: g.black?.result,
      timeClass: g.time_class,
      endTime: g.end_time,
      termination: "",
      opening: "",
    }));
}

/**
 * @param {string} username
 * @param {number} [limit]
 */
export async function fetchChesscomRecentGames(username, limit = DEFAULT_LIMIT) {
  const max = Math.min(100, Math.max(1, limit | 0));
  const name = username.trim();
  const archivesRes = await chesscomFetch(
    `https://api.chess.com/pub/player/${encodeURIComponent(name.toLowerCase())}/games/archives`
  );
  if (archivesRes.status === 404) {
    throw new Error(`Player "${username}" not found on Chess.com`);
  }
  if (!archivesRes.ok) {
    throw new Error(`Chess.com archives error: ${archivesRes.status}`);
  }
  const archivesData = await archivesRes.json();
  const archives = Array.isArray(archivesData.archives) ? archivesData.archives : [];
  const recent = archives.slice(-6).reverse();
  const collected = [];

  for (const archiveUrl of recent) {
    if (collected.length >= max) break;
    const res = await chesscomFetch(archiveUrl);
    if (!res.ok) continue;
    const data = await res.json();
    collected.push(...mapChesscomGames(data.games ?? []));
  }

  if (collected.length === 0) {
    const now = new Date();
    for (let i = 0; i < 6 && collected.length < max; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const url = `https://api.chess.com/pub/player/${encodeURIComponent(
        name.toLowerCase()
      )}/games/${y}/${m}`;
      const res = await chesscomFetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      collected.push(...mapChesscomGames(data.games ?? []));
    }
  }

  return collected
    .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))
    .slice(0, max);
}

/**
 * @param {"lichess"|"chesscom"} platform
 * @param {string} username
 * @param {number} [limit]
 */
export async function fetchRecentGamesForPrep(platform, username, limit = DEFAULT_LIMIT) {
  if (platform === "lichess") return fetchLichessRecentGames(username, limit);
  if (platform === "chesscom") return fetchChesscomRecentGames(username, limit);
  throw new Error('platform must be "lichess" or "chesscom"');
}

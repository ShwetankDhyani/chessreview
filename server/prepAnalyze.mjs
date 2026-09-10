/**
 * Opponent prep / current-form analyze — Vercel + Vite middleware.
 */

import { buildFormReportFromGames } from "./prepFormStats.mjs";
import { fetchRecentGamesForPrep } from "./prepGamesFetch.mjs";
import { getPrepCache, setPrepCache, prepCacheTtlMs } from "./prepCache.mjs";
import { generateFormSummary } from "./prepScouting.mjs";

const PLATFORMS = new Set(["lichess", "chesscom"]);

function normalizePlayerPayload(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const summary =
    typeof payload.summary === "string" && payload.summary.trim()
      ? payload.summary
      : typeof payload.scoutingReport === "string"
        ? payload.scoutingReport
        : "";
  return { ...payload, summary, scoutingReport: summary };
}

function normalizePlatform(value) {
  const p = String(value || "").trim().toLowerCase();
  if (p === "chess.com") return "chesscom";
  return p;
}

function clipName(value) {
  return String(value || "")
    .trim()
    .slice(0, 40);
}

/**
 * Analyze one player's recent form (cached 24h).
 * @param {{ username: string, platform: string, bypassCache?: boolean }} input
 */
export async function analyzePlayerForm(input) {
  const username = clipName(input.username);
  const platform = normalizePlatform(input.platform);
  if (!username) throw new Error("Missing username");
  if (!PLATFORMS.has(platform)) {
    throw new Error('platform must be "lichess" or "chesscom"');
  }

  if (!input.bypassCache) {
    const cached = await getPrepCache(platform, username);
    if (cached.hit && cached.payload) {
      const payload = normalizePlayerPayload(cached.payload);
      return { ...payload, cache: { hit: true, source: cached.source } };
    }
  }

  const games = await fetchRecentGamesForPrep(platform, username, 100);
  const form = buildFormReportFromGames(games, username);
  const summary = await generateFormSummary(form);
  const payload = {
    username: form.username,
    platform,
    sampleSize: form.sampleSize,
    stats: form.stats,
    summary,
    // Keep old key so older clients still read a blurb.
    scoutingReport: summary,
    generatedAt: new Date().toISOString(),
    cacheTtlMs: prepCacheTtlMs(),
  };
  await setPrepCache(platform, username, payload);
  return { ...payload, cache: { hit: false, source: null } };
}

/**
 * @param {object} body
 */
export async function runPrepAnalyze(body = {}) {
  const targetUsername = clipName(body.username ?? body.targetUsername);
  const targetPlatform = normalizePlatform(body.platform ?? body.targetPlatform);
  const selfUsername = clipName(body.selfUsername ?? body.meUsername);
  const selfPlatform = normalizePlatform(
    body.selfPlatform ?? body.mePlatform ?? targetPlatform
  );

  const opponent = await analyzePlayerForm({
    username: targetUsername,
    platform: targetPlatform,
    bypassCache: !!body.bypassCache,
  });

  let self = null;
  if (selfUsername) {
    self = await analyzePlayerForm({
      username: selfUsername,
      platform: selfPlatform || targetPlatform,
      bypassCache: !!body.bypassCache,
    });
  }

  return {
    ok: true,
    opponent,
    self,
    headToHead: self
      ? {
          rows: buildHeadToHeadRows(self, opponent),
        }
      : null,
  };
}

function buildHeadToHeadRows(self, opponent) {
  const s = self.stats;
  const o = opponent.stats;
  return [
    {
      label: "Games sampled",
      self: s.gamesAnalyzed,
      opponent: o.gamesAnalyzed,
    },
    {
      label: "Score %",
      self: s.byColor.overall.scorePct,
      opponent: o.byColor.overall.scorePct,
      format: "pct",
    },
    {
      label: "White score %",
      self: s.byColor.white.scorePct,
      opponent: o.byColor.white.scorePct,
      format: "pct",
    },
    {
      label: "Black score %",
      self: s.byColor.black.scorePct,
      opponent: o.byColor.black.scorePct,
      format: "pct",
    },
    {
      label: "TPR",
      self: s.tpr.value,
      opponent: o.tpr.value,
    },
    {
      label: "Avg opposition",
      self: s.tpr.averageOpponentRating,
      opponent: o.tpr.averageOpponentRating,
    },
    {
      label: "Tilt index",
      self: s.tilt.index,
      opponent: o.tilt.index,
    },
    {
      label: "Loss streaks (3+)",
      self: s.tilt.lossStreaksOf3Plus,
      opponent: o.tilt.lossStreaksOf3Plus,
    },
    {
      label: "Losses on time %",
      self: s.terminations.timePct,
      opponent: o.terminations.timePct,
      format: "pct",
    },
    {
      label: "Losses by resign %",
      self: s.terminations.resignationPct,
      opponent: o.terminations.resignationPct,
      format: "pct",
    },
  ];
}

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify(obj));
}

/** Vercel / Node (req, res) handler body */
export async function handlePrepRequest(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "POST only" });
    return;
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : req.body ?? {};
    const result = await runPrepAnalyze(body);
    sendJson(res, 200, result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Prep analyze failed";
    const status =
      /not found/i.test(message) || /must be/i.test(message) || /Missing/i.test(message)
        ? 400
        : 502;
    sendJson(res, status, { error: message });
  }
}

/** Vite dev middleware */
export function createPrepMiddleware() {
  return async (req, res, next) => {
    const url = req.url || "";
    if (!url.startsWith("/api/prep") && !url.startsWith("/api/h2h")) return next();

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.end();
      return;
    }

    if (req.method !== "POST") {
      sendJson(res, 405, { error: "POST only" });
      return;
    }

    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", async () => {
      try {
        const body = raw ? JSON.parse(raw) : {};
        const result = await runPrepAnalyze(body);
        sendJson(res, 200, result);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Prep analyze failed";
        const status =
          /not found/i.test(message) ||
          /must be/i.test(message) ||
          /Missing/i.test(message)
            ? 400
            : 502;
        sendJson(res, status, { error: message });
      }
    });
  };
}

/**
 * Lightweight current-form stats from PGN headers / public game metadata only.
 * No engine evaluation — header text + timestamps only.
 */

/** @typedef {"win"|"loss"|"draw"} GameOutcome */
/** @typedef {"white"|"black"} Color */

/**
 * Parse PGN tag-pair headers into a flat map.
 * @param {string} pgn
 * @returns {Record<string, string>}
 */
export function parsePgnHeaders(pgn) {
  const headers = {};
  if (!pgn || typeof pgn !== "string") return headers;
  const re = /\[([A-Za-z0-9_]+)\s+"([^"]*)"\]/g;
  let m;
  while ((m = re.exec(pgn)) !== null) {
    headers[m[1]] = m[2];
  }
  return headers;
}

/**
 * @param {string} isoLike Date like 2024.01.15 or 2024-01-15
 * @param {string} [time] HH:MM:SS
 * @returns {number | null} epoch ms
 */
export function parsePgnDateTimeMs(isoLike, time) {
  if (!isoLike || isoLike === "????.??.??") return null;
  const d = String(isoLike).trim().replace(/\./g, "-");
  const t = time && /^\d{1,2}:\d{2}/.test(time) ? time.trim() : "12:00:00";
  const ms = Date.parse(`${d}T${t}Z`);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * @param {Record<string, string>} headers
 * @param {string} username
 * @returns {{ color: Color, outcome: GameOutcome, opponentRating: number | null, endMs: number | null, termination: string, opening: string, result: string } | null}
 */
export function classifyGameFromHeaders(headers, username) {
  const target = String(username || "").trim().toLowerCase();
  if (!target) return null;
  const white = String(headers.White || "").trim();
  const black = String(headers.Black || "").trim();
  let color = null;
  if (white.toLowerCase() === target) color = "white";
  else if (black.toLowerCase() === target) color = "black";
  else return null;

  const result = String(headers.Result || "*").trim();
  /** @type {GameOutcome} */
  let outcome = "draw";
  if (result === "1-0") outcome = color === "white" ? "win" : "loss";
  else if (result === "0-1") outcome = color === "black" ? "win" : "loss";
  else if (result === "1/2-1/2") outcome = "draw";
  else {
    // Incomplete / unknown — skip from ratios rather than inventing draws.
    return null;
  }

  const oppRaw =
    color === "white" ? headers.BlackElo || headers.BlackRating : headers.WhiteElo || headers.WhiteRating;
  const opponentRating = oppRaw != null && oppRaw !== "?" ? Number(oppRaw) : null;

  const date = headers.UTCDate || headers.Date || "";
  const time = headers.UTCTime || headers.EndTime || headers.Time || "";
  const endMs = parsePgnDateTimeMs(date, time);

  return {
    color,
    outcome,
    opponentRating: Number.isFinite(opponentRating) ? opponentRating : null,
    endMs,
    termination: String(headers.Termination || headers.Status || "").trim(),
    opening: String(headers.Opening || headers.ECO || "").trim(),
    result,
  };
}

/**
 * Normalize API game rows (already mapped) into the same shape as header classify.
 * @param {{ white: string, black: string, whiteRating?: number, blackRating?: number, whiteResult?: string, blackResult?: string, endTime?: number, termination?: string, opening?: string, pgn?: string }} game
 * @param {string} username
 */
export function classifyGameFromListItem(game, username) {
  const headers = game.pgn ? parsePgnHeaders(game.pgn) : {};
  // Prefer explicit list fields; fill gaps from PGN headers.
  const merged = {
    White: game.white || headers.White || "",
    Black: game.black || headers.Black || "",
    WhiteElo: game.whiteRating != null ? String(game.whiteRating) : headers.WhiteElo || "",
    BlackElo: game.blackRating != null ? String(game.blackRating) : headers.BlackElo || "",
    Result: headers.Result || "",
    Termination: game.termination || headers.Termination || "",
    Opening: game.opening || headers.Opening || headers.ECO || "",
    UTCDate: headers.UTCDate || headers.Date || "",
    UTCTime: headers.UTCTime || "",
  };

  // Derive Result from Chess.com-style result fields when PGN Result missing.
  if (!merged.Result || merged.Result === "*") {
    const wr = String(game.whiteResult || "").toLowerCase();
    const br = String(game.blackResult || "").toLowerCase();
    if (wr === "win") merged.Result = "1-0";
    else if (br === "win") merged.Result = "0-1";
    else if (wr === "draw" || br === "draw" || wr === "agreed" || br === "agreed" || wr === "stalemate" || br === "stalemate" || wr === "repetition" || br === "repetition" || wr === "insufficient" || br === "insufficient" || wr === "50move" || br === "50move" || wr === "timevsinsufficient" || br === "timevsinsufficient") {
      merged.Result = "1/2-1/2";
    } else if (["checkmated", "timeout", "resigned", "abandoned", "lose"].includes(wr)) {
      merged.Result = "0-1";
    } else if (["checkmated", "timeout", "resigned", "abandoned", "lose"].includes(br)) {
      merged.Result = "1-0";
    }
  }

  // Prefer Chess.com end_time (seconds) for tilt timing.
  const classified = classifyGameFromHeaders(merged, username);
  if (!classified) return null;
  if (game.endTime && Number.isFinite(game.endTime)) {
    classified.endMs = game.endTime * 1000;
  }
  if (!classified.termination && (game.whiteResult || game.blackResult)) {
    const my =
      classified.color === "white"
        ? String(game.whiteResult || "")
        : String(game.blackResult || "");
    classified.termination = my;
  }
  return classified;
}

function emptyColorSplit() {
  return { played: 0, wins: 0, losses: 0, draws: 0, winPct: 0, scorePct: 0 };
}

function finalizeColorSplit(split) {
  const played = split.played;
  split.winPct = played ? Math.round((1000 * split.wins) / played) / 10 : 0;
  split.scorePct =
    played
      ? Math.round((1000 * (split.wins + 0.5 * split.draws)) / played) / 10
      : 0;
  return split;
}

/**
 * Classic linear performance-rating approximation from score vs average opposition.
 * TPR ≈ avgOpp + 400 × (2 × score − 1)
 * @param {number} avgOpp
 * @param {number} score 0..1
 */
export function computeTpr(avgOpp, score) {
  if (!Number.isFinite(avgOpp) || !Number.isFinite(score)) return null;
  return Math.round(avgOpp + 400 * (2 * score - 1));
}

/**
 * @param {string} termination
 * @param {GameOutcome} outcome
 */
export function categorizeTermination(termination, outcome) {
  const t = String(termination || "").toLowerCase();
  if (outcome !== "loss") return "other";
  if (
    t.includes("time") ||
    t.includes("timeout") ||
    t === "timeout" ||
    t.includes("on time")
  ) {
    return "time";
  }
  if (t.includes("resign")) return "resignation";
  if (
    t.includes("mate") ||
    t.includes("checkmate") ||
    t === "checkmated" ||
    t.includes("mate")
  ) {
    return "mate";
  }
  if (t.includes("abandon")) return "abandoned";
  return "other";
}

/**
 * @param {Array<ReturnType<typeof classifyGameFromHeaders>>} games newest-first preferred
 */
export function computeFormStats(games) {
  const rows = (games || []).filter(Boolean);
  const byColor = {
    white: emptyColorSplit(),
    black: emptyColorSplit(),
    overall: emptyColorSplit(),
  };

  const oppRatings = [];
  /** @type {number[]} */
  const lossStreakLengths = [];
  let currentLossStreak = 0;
  let rapidRequeuesAfterLoss = 0;
  let lossesWithTiming = 0;

  const termCounts = { time: 0, resignation: 0, mate: 0, abandoned: 0, other: 0 };
  let losses = 0;

  // Chronological (oldest → newest) for streaks / requeue gaps.
  const chrono = [...rows].sort((a, b) => {
    const am = a.endMs ?? 0;
    const bm = b.endMs ?? 0;
    return am - bm;
  });

  for (let i = 0; i < chrono.length; i++) {
    const g = chrono[i];
    const bucket = byColor[g.color];
    bucket.played += 1;
    byColor.overall.played += 1;
    if (g.outcome === "win") {
      bucket.wins += 1;
      byColor.overall.wins += 1;
      if (currentLossStreak >= 3) lossStreakLengths.push(currentLossStreak);
      currentLossStreak = 0;
    } else if (g.outcome === "loss") {
      bucket.losses += 1;
      byColor.overall.losses += 1;
      currentLossStreak += 1;
      losses += 1;
      const cat = categorizeTermination(g.termination, g.outcome);
      termCounts[cat] = (termCounts[cat] || 0) + 1;

      if (i + 1 < chrono.length && g.endMs != null && chrono[i + 1].endMs != null) {
        lossesWithTiming += 1;
        const gap = chrono[i + 1].endMs - g.endMs;
        if (gap >= 0 && gap < 30_000) rapidRequeuesAfterLoss += 1;
      }
    } else {
      bucket.draws += 1;
      byColor.overall.draws += 1;
      if (currentLossStreak >= 3) lossStreakLengths.push(currentLossStreak);
      currentLossStreak = 0;
    }

    if (g.opponentRating != null) oppRatings.push(g.opponentRating);
  }
  if (currentLossStreak >= 3) lossStreakLengths.push(currentLossStreak);

  finalizeColorSplit(byColor.white);
  finalizeColorSplit(byColor.black);
  finalizeColorSplit(byColor.overall);

  const avgOpp =
    oppRatings.length > 0
      ? Math.round(oppRatings.reduce((a, b) => a + b, 0) / oppRatings.length)
      : null;
  const score =
    byColor.overall.played > 0
      ? (byColor.overall.wins + 0.5 * byColor.overall.draws) /
        byColor.overall.played
      : 0;
  const tpr = avgOpp != null ? computeTpr(avgOpp, score) : null;

  const lossStreakCount = lossStreakLengths.length;
  const longestLossStreak = lossStreakLengths.reduce((m, n) => Math.max(m, n), 0);
  const rapidRate =
    lossesWithTiming > 0 ? rapidRequeuesAfterLoss / lossesWithTiming : 0;
  // 0–100 tilt index: streak pressure + rapid requeue share.
  const tiltIndex = Math.min(
    100,
    Math.round(
      Math.min(60, longestLossStreak * 12) +
        Math.min(40, rapidRate * 40) +
        Math.min(20, lossStreakCount * 5)
    )
  );

  const termPct = (n) =>
    losses > 0 ? Math.round((1000 * n) / losses) / 10 : 0;

  return {
    gamesAnalyzed: byColor.overall.played,
    byColor: {
      white: byColor.white,
      black: byColor.black,
      overall: byColor.overall,
    },
    tpr: {
      value: tpr,
      averageOpponentRating: avgOpp,
      scorePct: Math.round(score * 1000) / 10,
    },
    tilt: {
      index: tiltIndex,
      lossStreaksOf3Plus: lossStreakCount,
      longestLossStreak,
      rapidRequeuesAfterLoss,
      rapidRequeueSampleLosses: lossesWithTiming,
    },
    terminations: {
      losses,
      timePct: termPct(termCounts.time),
      resignationPct: termPct(termCounts.resignation),
      matePct: termPct(termCounts.mate),
      abandonedPct: termPct(termCounts.abandoned),
      otherPct: termPct(termCounts.other),
      counts: termCounts,
    },
  };
}

/**
 * Build stats from raw game list items + username.
 * @param {Array<object>} games
 * @param {string} username
 */
export function buildFormReportFromGames(games, username) {
  const classified = (games || [])
    .map((g) => classifyGameFromListItem(g, username))
    .filter(Boolean);
  // Prefer newest 100 after classification.
  classified.sort((a, b) => (b.endMs ?? 0) - (a.endMs ?? 0));
  const sliced = classified.slice(0, 100);
  return {
    username: String(username).trim(),
    stats: computeFormStats(sliced),
    sampleSize: sliced.length,
  };
}

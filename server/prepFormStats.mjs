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

/** Rating gap (Elo) before a game counts as higher / lower opposition. */
export const VS_RATING_GAP = 50;
/** Minimum games in a band before we trust the split. */
export const VS_RATING_MIN_GAMES = 8;

/**
 * @param {Record<string, string>} headers
 * @param {string} username
 * @returns {{ color: Color, outcome: GameOutcome, ownRating: number | null, opponentRating: number | null, endMs: number | null, termination: string, opening: string, result: string } | null}
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

  const ownRaw =
    color === "white" ? headers.WhiteElo || headers.WhiteRating : headers.BlackElo || headers.BlackRating;
  const oppRaw =
    color === "white" ? headers.BlackElo || headers.BlackRating : headers.WhiteElo || headers.WhiteRating;
  const ownRating = ownRaw != null && ownRaw !== "?" ? Number(ownRaw) : null;
  const opponentRating = oppRaw != null && oppRaw !== "?" ? Number(oppRaw) : null;

  const date = headers.UTCDate || headers.Date || "";
  const time = headers.UTCTime || headers.EndTime || headers.Time || "";
  const endMs = parsePgnDateTimeMs(date, time);

  return {
    color,
    outcome,
    ownRating: Number.isFinite(ownRating) ? ownRating : null,
    opponentRating: Number.isFinite(opponentRating) ? opponentRating : null,
    endMs,
    termination: String(headers.Termination || headers.Status || "").trim(),
    opening: String(headers.Opening || headers.ECO || "").trim(),
    result,
  };
}

/**
 * @param {number | null | undefined} ownRating
 * @param {number | null | undefined} opponentRating
 * @param {number} [gap]
 * @returns {"higher"|"lower"|"peer"|null}
 */
export function ratingBandForGame(ownRating, opponentRating, gap = VS_RATING_GAP) {
  if (!Number.isFinite(ownRating) || !Number.isFinite(opponentRating)) return null;
  const delta = opponentRating - ownRating;
  if (delta >= gap) return "higher";
  if (delta <= -gap) return "lower";
  return "peer";
}

/**
 * @param {{ higher: { played: number, scorePct: number }, lower: { played: number, scorePct: number }, peer?: { played: number, scorePct: number } }} bands
 * @param {number} [minGames]
 * @returns {{ key: string | null, title: string | null, gapPct: number | null }}
 */
export function deriveVsRatingArchetype(bands, minGames = VS_RATING_MIN_GAMES) {
  const higher = bands?.higher;
  const lower = bands?.lower;
  if (!higher || !lower || higher.played < minGames || lower.played < minGames) {
    return { key: null, title: null, gapPct: null };
  }
  const gapPct = Math.round((higher.scorePct - lower.scorePct) * 10) / 10;

  // Soft vs weaker, sharp vs stronger.
  if (
    gapPct >= 12 &&
    lower.scorePct < 48 &&
    higher.scorePct >= 50
  ) {
    return { key: "nerfed_gun", title: "Nerfed gun", gapPct };
  }
  // Strong relative results against higher-rated opposition.
  if (gapPct >= 10 && higher.scorePct >= 48) {
    return { key: "giant_killer", title: "Giant killer", gapPct };
  }
  // Punishes lower-rated, struggles when outrated.
  if (gapPct <= -12 && lower.scorePct >= 55) {
    return { key: "feasts_lower", title: "Feasts lower", gapPct };
  }
  if (lower.scorePct >= 62 && higher.scorePct < 42) {
    return { key: "feasts_lower", title: "Feasts lower", gapPct };
  }
  return { key: "even", title: null, gapPct };
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
  const vsRating = {
    higher: emptyColorSplit(),
    lower: emptyColorSplit(),
    peer: emptyColorSplit(),
  };
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

    const band = ratingBandForGame(g.ownRating, g.opponentRating);
    if (band) {
      const vb = vsRating[band];
      vb.played += 1;
      if (g.outcome === "win") vb.wins += 1;
      else if (g.outcome === "loss") vb.losses += 1;
      else vb.draws += 1;
    }
  }
  if (currentLossStreak >= 3) lossStreakLengths.push(currentLossStreak);

  finalizeColorSplit(byColor.white);
  finalizeColorSplit(byColor.black);
  finalizeColorSplit(byColor.overall);
  finalizeColorSplit(vsRating.higher);
  finalizeColorSplit(vsRating.lower);
  finalizeColorSplit(vsRating.peer);

  const vsArchetype = deriveVsRatingArchetype(vsRating);

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

  /** Rolling form curve (oldest → newest) for charts. */
  const formTrend = [];
  let rollWins = 0;
  let rollDraws = 0;
  let rollPlayed = 0;
  const WINDOW = 10;
  /** @type {Array<{outcome: string, points: number}>} */
  const recentWindow = [];
  for (let i = 0; i < chrono.length; i++) {
    const g = chrono[i];
    const points = g.outcome === "win" ? 1 : g.outcome === "draw" ? 0.5 : 0;
    recentWindow.push({ outcome: g.outcome, points });
    rollWins += g.outcome === "win" ? 1 : 0;
    rollDraws += g.outcome === "draw" ? 1 : 0;
    rollPlayed += 1;
    if (recentWindow.length > WINDOW) {
      const dropped = recentWindow.shift();
      rollPlayed -= 1;
      if (dropped.outcome === "win") rollWins -= 1;
      if (dropped.outcome === "draw") rollDraws -= 1;
    }
    const rollScore =
      rollPlayed > 0
        ? Math.round((1000 * (rollWins + 0.5 * rollDraws)) / rollPlayed) / 10
        : 0;
    formTrend.push({
      n: i + 1,
      scorePct: rollScore,
      result: g.outcome,
      color: g.color,
    });
  }

  const resultsSpark = chrono.map((g, i) => ({
    i: i + 1,
    outcome: g.outcome,
    value: g.outcome === "win" ? 1 : g.outcome === "draw" ? 0.5 : 0,
    color: g.color,
  }));

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
    vsRating: {
      gap: VS_RATING_GAP,
      minGames: VS_RATING_MIN_GAMES,
      higher: vsRating.higher,
      lower: vsRating.lower,
      peer: vsRating.peer,
      archetype: vsArchetype.key,
      archetypeTitle: vsArchetype.title,
      gapPct: vsArchetype.gapPct,
    },
    charts: {
      formTrend,
      resultsSpark,
      wld: [
        { key: "wins", label: "Wins", value: byColor.overall.wins },
        { key: "draws", label: "Draws", value: byColor.overall.draws },
        { key: "losses", label: "Losses", value: byColor.overall.losses },
      ],
      byColorScore: [
        {
          key: "white",
          label: "White",
          scorePct: byColor.white.scorePct,
          played: byColor.white.played,
        },
        {
          key: "black",
          label: "Black",
          scorePct: byColor.black.scorePct,
          played: byColor.black.played,
        },
      ],
      byRatingScore: [
        {
          key: "higher",
          label: "Higher",
          scorePct: vsRating.higher.scorePct,
          played: vsRating.higher.played,
        },
        {
          key: "peer",
          label: "Peer",
          scorePct: vsRating.peer.scorePct,
          played: vsRating.peer.played,
        },
        {
          key: "lower",
          label: "Lower",
          scorePct: vsRating.lower.scorePct,
          played: vsRating.lower.played,
        },
      ].filter((row) => row.played > 0),
      terminations: [
        { key: "time", label: "On time", value: termCounts.time, pct: termPct(termCounts.time) },
        {
          key: "resignation",
          label: "Resign",
          value: termCounts.resignation,
          pct: termPct(termCounts.resignation),
        },
        { key: "mate", label: "Mate", value: termCounts.mate, pct: termPct(termCounts.mate) },
        {
          key: "abandoned",
          label: "Abandon",
          value: termCounts.abandoned,
          pct: termPct(termCounts.abandoned),
        },
        { key: "other", label: "Other", value: termCounts.other, pct: termPct(termCounts.other) },
      ].filter((row) => row.value > 0),
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

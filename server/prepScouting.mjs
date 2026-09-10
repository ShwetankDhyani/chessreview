/**
 * Short plain-English summary of recent form stats.
 * Uses Gemini when GEMINI_API_KEY is set; otherwise a local fallback.
 */

/**
 * @param {object} formReport buildFormReportFromGames result
 * @returns {Promise<string>}
 */
export async function generateFormSummary(formReport) {
  const key =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.VITE_GEMINI_API_KEY?.trim() ||
    "";
  if (!key || key === "your_api_key_here") {
    return fallbackFormSummary(formReport);
  }

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const stats = formReport.stats;
    const prompt = `Write exactly 3 short, plain sentences about this chess player's recent results.
Sound like a person, not a coach brochure. Use only the numbers given. No bullet points. No markdown.
Username: ${formReport.username}
Games: ${stats.gamesAnalyzed}
Overall W-L-D: ${stats.byColor.overall.wins}-${stats.byColor.overall.losses}-${stats.byColor.overall.draws} (score ${stats.byColor.overall.scorePct}%)
White score: ${stats.byColor.white.scorePct}% over ${stats.byColor.white.played} games
Black score: ${stats.byColor.black.scorePct}% over ${stats.byColor.black.played} games
TPR: ${stats.tpr.value ?? "n/a"} vs avg opp ${stats.tpr.averageOpponentRating ?? "n/a"}
Tilt index 0-100: ${stats.tilt.index} (loss streaks of 3+: ${stats.tilt.lossStreaksOf3Plus}, longest ${stats.tilt.longestLossStreak}, games started within 30s of a loss: ${stats.tilt.rapidRequeuesAfterLoss})
Losses ending on time ${stats.terminations.timePct}%, resign ${stats.terminations.resignationPct}%, mate ${stats.terminations.matePct}%`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.35, maxOutputTokens: 220 },
    });
    const text = result?.response?.text?.()?.trim();
    if (text) return text.slice(0, 800);
  } catch (e) {
    console.warn("[h2h] summary failed:", e);
  }
  return fallbackFormSummary(formReport);
}

/** @deprecated Use generateFormSummary */
export async function generateScoutingReport(formReport) {
  return generateFormSummary(formReport);
}

export function fallbackFormSummary(formReport) {
  const s = formReport.stats;
  const o = s.byColor.overall;
  const colorBias =
    s.byColor.white.scorePct - s.byColor.black.scorePct >= 8
      ? "Doing better with White than Black in this stretch."
      : s.byColor.black.scorePct - s.byColor.white.scorePct >= 8
        ? "Doing better with Black than White in this stretch."
        : "White and Black results are about even.";
  const tiltNote =
    s.tilt.index >= 45
      ? `A few rough patches show up — ${s.tilt.lossStreaksOf3Plus} streaks of 3+ losses, longest ${s.tilt.longestLossStreak}, and ${s.tilt.rapidRequeuesAfterLoss} quick rematches after a loss.`
      : `Not many long losing streaks in the sample (tilt ${s.tilt.index}).`;
  const term =
    s.terminations.timePct >= 25
      ? `${s.terminations.timePct}% of losses are on time.`
      : `Losses are mostly resign (${s.terminations.resignationPct}%) or mate (${s.terminations.matePct}%).`;
  return `${formReport.username} scores ${o.scorePct}% over ${s.gamesAnalyzed} recent games (TPR ${s.tpr.value ?? "n/a"}). ${colorBias} ${tiltNote} ${term}`
    .replace(/\s+/g, " ")
    .trim();
}

/** @deprecated Use fallbackFormSummary */
export function fallbackScoutingReport(formReport) {
  return fallbackFormSummary(formReport);
}

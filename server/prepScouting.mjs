/**
 * LLM scouting report for prep form stats (server-only Gemini key).
 */

/**
 * @param {object} formReport buildFormReportFromGames result
 * @returns {Promise<string | null>}
 */
export async function generateScoutingReport(formReport) {
  const key =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.VITE_GEMINI_API_KEY?.trim() ||
    "";
  if (!key || key === "your_api_key_here") {
    return fallbackScoutingReport(formReport);
  }

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const stats = formReport.stats;
    const prompt = `You are a concise chess coach writing a scouting note.
Write exactly 3 short sentences about this opponent's recent form.
Use only the numbers given. No bullet points. No markdown.
Username: ${formReport.username}
Games: ${stats.gamesAnalyzed}
Overall W-L-D: ${stats.byColor.overall.wins}-${stats.byColor.overall.losses}-${stats.byColor.overall.draws} (score ${stats.byColor.overall.scorePct}%)
White score: ${stats.byColor.white.scorePct}% over ${stats.byColor.white.played} games
Black score: ${stats.byColor.black.scorePct}% over ${stats.byColor.black.played} games
TPR: ${stats.tpr.value ?? "n/a"} vs avg opp ${stats.tpr.averageOpponentRating ?? "n/a"}
Tilt index 0-100: ${stats.tilt.index} (loss streaks of 3+: ${stats.tilt.lossStreaksOf3Plus}, longest ${stats.tilt.longestLossStreak}, rapid requeues after losses: ${stats.tilt.rapidRequeuesAfterLoss})
Loss terminations — time ${stats.terminations.timePct}%, resign ${stats.terminations.resignationPct}%, mate ${stats.terminations.matePct}%`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 220 },
    });
    const text = result?.response?.text?.()?.trim();
    if (text) return text.slice(0, 800);
  } catch (e) {
    console.warn("[prep] scouting LLM failed:", e);
  }
  return fallbackScoutingReport(formReport);
}

export function fallbackScoutingReport(formReport) {
  const s = formReport.stats;
  const o = s.byColor.overall;
  const colorBias =
    s.byColor.white.scorePct - s.byColor.black.scorePct >= 8
      ? "Stronger results with White than Black recently."
      : s.byColor.black.scorePct - s.byColor.white.scorePct >= 8
        ? "Scoring better with Black than White in this sample."
        : "Results are fairly balanced across colors.";
  const tiltNote =
    s.tilt.index >= 45
      ? `Tilt looks elevated (index ${s.tilt.index}) with ${s.tilt.lossStreaksOf3Plus} loss streaks of 3+ and ${s.tilt.rapidRequeuesAfterLoss} sub-30s requeues after defeats.`
      : `Emotional control looks steady (tilt index ${s.tilt.index}); loss streaks and rapid requeues are limited.`;
  const term =
    s.terminations.timePct >= 25
      ? `A notable ${s.terminations.timePct}% of losses are on time — practical clock pressure can help.`
      : `Losses skew toward resign/mate (${s.terminations.resignationPct}% resign / ${s.terminations.matePct}% mate) rather than flags.`;
  return `${formReport.username} scores ${o.scorePct}% over ${s.gamesAnalyzed} recent games (TPR ${s.tpr.value ?? "n/a"}). ${colorBias} ${tiltNote} ${term}`
    .replace(/\s+/g, " ")
    .trim();
}

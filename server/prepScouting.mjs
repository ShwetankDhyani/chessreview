/**
 * Personality-forward H2H form brief.
 * Prefers a structured local write-up (reliable formatting); Gemini can polish
 * the headline when GEMINI_API_KEY is set.
 */

/**
 * @typedef {{ label: string, body: string }} BriefNote
 * @typedef {{ headline: string, notes: BriefNote[], plain: string }} FormBrief
 */

/**
 * @param {object} formReport
 * @returns {FormBrief}
 */
export function buildFormBrief(formReport) {
  const name = String(formReport.username || "This player").trim() || "This player";
  const s = formReport.stats;
  const o = s.byColor.overall;
  const w = s.byColor.white;
  const b = s.byColor.black;
  const tpr = s.tpr.value;
  const avgOpp = s.tpr.averageOpponentRating;
  const score = o.scorePct;
  const record = `${o.wins}–${o.losses}–${o.draws}`;

  let headline;
  if (score >= 58) {
    headline = `${name} has been on a roll — ${score}% over ${s.gamesAnalyzed} games (${record}).`;
  } else if (score <= 42) {
    headline = `${name} is grinding through a tough stretch — ${score}% across ${s.gamesAnalyzed} games (${record}).`;
  } else {
    headline = `${name} is right on the knife-edge: ${score}% over ${s.gamesAnalyzed} games (${record}).`;
  }
  if (tpr != null && avgOpp != null) {
    const delta = tpr - avgOpp;
    if (Math.abs(delta) <= 25) {
      headline += ` TPR ${tpr} sits almost on top of the opposition (${avgOpp}).`;
    } else if (delta > 0) {
      headline += ` TPR ${tpr} is a bit above the room (avg opp ${avgOpp}).`;
    } else {
      headline += ` TPR ${tpr} trails the room a touch (avg opp ${avgOpp}).`;
    }
  } else if (tpr != null) {
    headline += ` Performance rating lands at ${tpr}.`;
  }

  /** @type {BriefNote[]} */
  const notes = [];

  const colorGap = w.scorePct - b.scorePct;
  if (w.played > 0 && b.played > 0) {
    if (colorGap >= 8) {
      notes.push({
        label: "Colors",
        body: `Comfortable with White (${w.scorePct}% over ${w.played}) and clearly less so with Black (${b.scorePct}% over ${b.played}). Worth leaning on that gap.`,
      });
    } else if (colorGap <= -8) {
      notes.push({
        label: "Colors",
        body: `Black is the happier color right now (${b.scorePct}% over ${b.played}) versus White (${w.scorePct}% over ${w.played}).`,
      });
    } else if (colorGap >= 3) {
      notes.push({
        label: "Colors",
        body: `Slight edge with White in this stretch (${w.scorePct}% over ${w.played}) versus Black (${b.scorePct}% over ${b.played}).`,
      });
    } else if (colorGap <= -3) {
      notes.push({
        label: "Colors",
        body: `Slight edge with Black here (${b.scorePct}% over ${b.played}) versus White (${w.scorePct}% over ${w.played}).`,
      });
    } else {
      notes.push({
        label: "Colors",
        body: `No big color story — White ${w.scorePct}% (${w.played} games), Black ${b.scorePct}% (${b.played}). Pretty even either way.`,
      });
    }
  }

  if (s.tilt.index >= 55) {
    notes.push({
      label: "Tilt",
      body: `The rough patches stick. ${s.tilt.lossStreaksOf3Plus} streaks of 3+ losses (longest ${s.tilt.longestLossStreak})${
        s.tilt.rapidRequeuesAfterLoss > 0
          ? `, and ${s.tilt.rapidRequeuesAfterLoss} times they jumped straight back in after a loss`
          : ", though they aren't rage-queueing after defeats"
      }.`,
    });
  } else if (s.tilt.index >= 35) {
    notes.push({
      label: "Tilt",
      body: `Some wobble, nothing wild — tilt sits at ${s.tilt.index}, with ${s.tilt.lossStreaksOf3Plus} longer losing runs (longest ${s.tilt.longestLossStreak}).`,
    });
  } else {
    notes.push({
      label: "Tilt",
      body: `Keeps a fairly cool head in this sample (tilt ${s.tilt.index}). Long losing runs are rare.`,
    });
  }

  if (s.terminations.losses > 0) {
    const parts = [];
    if (s.terminations.resignationPct >= 55) {
      parts.push(`resignations (${s.terminations.resignationPct}%)`);
    } else if (s.terminations.resignationPct >= 40) {
      parts.push(`resigning often (${s.terminations.resignationPct}%)`);
    }
    if (s.terminations.timePct >= 20) {
      parts.push(`flagging (${s.terminations.timePct}% on time)`);
    }
    if (s.terminations.matePct >= 25) {
      parts.push(`getting mated (${s.terminations.matePct}%)`);
    }
    if (parts.length === 0) {
      parts.push(
        `resign ${s.terminations.resignationPct}%, time ${s.terminations.timePct}%, mate ${s.terminations.matePct}%`
      );
    }
    notes.push({
      label: "How it ends",
      body:
        parts.length === 1
          ? `When things go south, it's mostly ${parts[0]}.`
          : `When things go south, it's mostly ${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}.`,
    });
  }

  const vs = s.vsRating;
  if (vs?.higher && vs?.lower && vs.archetype) {
    const hi = vs.higher;
    const lo = vs.lower;
    const gap = vs.gap || 100;
    if (vs.archetype === "nerfed_gun") {
      notes.push({
        label: "Matchups",
        body: `Nerfed gun energy — soft against opponents ${gap}+ Elo lower (${lo.scorePct}% over ${lo.played}), then suddenly sharp vs ${gap}+ higher (${hi.scorePct}% over ${hi.played}).`,
      });
    } else if (vs.archetype === "giant_killer") {
      notes.push({
        label: "Matchups",
        body: `Giant-killer stretch — ${hi.scorePct}% against opponents ${gap}+ Elo higher (${hi.played} games), versus ${lo.scorePct}% when ${gap}+ Elo favored (${lo.played}).`,
      });
    } else if (vs.archetype === "feasts_lower") {
      notes.push({
        label: "Matchups",
        body: `Feasting on much weaker fields — ${lo.scorePct}% against opponents ${gap}+ Elo lower (${lo.played}), but only ${hi.scorePct}% vs ${gap}+ higher (${hi.played}).`,
      });
    }
  }

  const plain = [headline, ...notes.map((n) => `${n.label}: ${n.body}`)].join(
    " "
  );

  return { headline, notes, plain };
}

/**
 * @param {object} formReport
 * @returns {Promise<FormBrief>}
 */
export async function generateFormBrief(formReport) {
  const brief = buildFormBrief(formReport);
  const key =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.VITE_GEMINI_API_KEY?.trim() ||
    "";
  if (!key || key === "your_api_key_here") return brief;

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `Rewrite this chess form headline in 1-2 punchy sentences. Keep every number. Sound human, a bit wry, not corporate. No markdown.
Headline: ${brief.headline}`;
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.55, maxOutputTokens: 120 },
    });
    const text = result?.response?.text?.()?.trim();
    if (text) {
      const headline = text.slice(0, 320);
      return {
        ...brief,
        headline,
        plain: [headline, ...brief.notes.map((n) => `${n.label}: ${n.body}`)].join(
          " "
        ),
      };
    }
  } catch (e) {
    console.warn("[h2h] brief headline polish failed:", e);
  }
  return brief;
}

/** @returns {Promise<string>} */
export async function generateFormSummary(formReport) {
  const brief = await generateFormBrief(formReport);
  return brief.plain;
}

/** @deprecated */
export async function generateScoutingReport(formReport) {
  return generateFormSummary(formReport);
}

export function fallbackFormSummary(formReport) {
  return buildFormBrief(formReport).plain;
}

/** @deprecated */
export function fallbackScoutingReport(formReport) {
  return fallbackFormSummary(formReport);
}

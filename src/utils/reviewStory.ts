import type { AnalyzedMove, KeyMoment, ReviewSummary } from "../types";
import { CLASSIFICATION_META } from "./classificationMeta";

export interface ReviewStory {
  headline: string;
  bullets: string[];
  homework: Array<{ moveIdx: number; label: string; fen: string }>;
}

function phaseGap(
  phase: ReviewSummary["phaseAccuracy"],
  side: "white" | "black"
): { phase: string; gap: number } | null {
  if (!phase) return null;
  const entries: Array<{ phase: string; gap: number }> = [
    {
      phase: "opening",
      gap: phase.opening[side] - phase.opening[side === "white" ? "black" : "white"],
    },
    {
      phase: "middlegame",
      gap:
        phase.middlegame[side] -
        phase.middlegame[side === "white" ? "black" : "white"],
    },
    {
      phase: "endgame",
      gap: phase.endgame[side] - phase.endgame[side === "white" ? "black" : "white"],
    },
  ];
  const best = entries.sort((a, b) => b.gap - a.gap)[0];
  if (Math.abs(best.gap) < 8) return null;
  return best;
}

function countMistakes(
  summary: ReviewSummary,
  side: "white" | "black"
): number {
  const c = side === "white" ? summary.white : summary.black;
  return c.inaccuracy + c.mistake + c.blunder;
}

export function buildReviewStory(
  summary: ReviewSummary,
  moves: AnalyzedMove[],
  whiteName: string,
  blackName: string
): ReviewStory {
  const wAcc = summary.accuracy.white;
  const bAcc = summary.accuracy.black;
  const wErr = countMistakes(summary, "white");
  const bErr = countMistakes(summary, "black");

  let headline = "Even game — both sides had chances.";
  if (Math.abs(wAcc - bAcc) >= 12) {
    const better = wAcc > bAcc ? whiteName : blackName;
    const worse = wAcc > bAcc ? blackName : whiteName;
    headline = `${better} was more accurate overall; ${worse} gave away more evaluation.`;
  } else if (wErr + bErr === 0) {
    headline = "Clean game — very few serious mistakes from either side.";
  } else if (wErr > bErr + 2) {
    headline = `${whiteName} had more critical slips than ${blackName}.`;
  } else if (bErr > wErr + 2) {
    headline = `${blackName} had more critical slips than ${whiteName}.`;
  }

  const bullets: string[] = [];

  const wPhase = phaseGap(summary.phaseAccuracy, "white");
  const bPhase = phaseGap(summary.phaseAccuracy, "black");
  const pa = summary.phaseAccuracy;
  if (wPhase && wPhase.gap >= 10 && pa) {
    const acc =
      wPhase.phase === "opening"
        ? pa.opening.white
        : wPhase.phase === "middlegame"
          ? pa.middlegame.white
          : pa.endgame.white;
    bullets.push(
      `${whiteName} was sharper in the ${wPhase.phase} (${acc.toFixed(0)}% accuracy there).`
    );
  }
  if (bPhase && bPhase.gap >= 10 && bullets.length < 2 && pa) {
    const acc =
      bPhase.phase === "opening"
        ? pa.opening.black
        : bPhase.phase === "middlegame"
          ? pa.middlegame.black
          : pa.endgame.black;
    bullets.push(
      `${blackName} was sharper in the ${bPhase.phase} (${acc.toFixed(0)}% accuracy there).`
    );
  }

  const moments = [...(summary.keyMoments ?? [])].sort(
    (a, b) => b.swing - a.swing
  );
  const top = moments[0];
  if (top) {
    const meta = top.classification
      ? CLASSIFICATION_META[top.classification as keyof typeof CLASSIFICATION_META]
      : null;
    const tag = meta?.label ?? "Critical moment";
    bullets.push(
      `Biggest swing: move ${top.moveNumber}${top.color === "w" ? "." : "…"} ${top.san} (${tag}, ±${top.swing.toFixed(1)} pawns).`
    );
  }

  if (summary.white.blunder + summary.black.blunder > 0) {
    bullets.push(
      `${summary.white.blunder + summary.black.blunder} blunder${
        summary.white.blunder + summary.black.blunder === 1 ? "" : "s"
      } — tap a key moment below to replay those positions.`
    );
  }

  if (bullets.length === 0) {
    bullets.push("Step through key moments below to see where the eval shifted.");
  }

  const homework = pickHomework(moments, moves);

  return { headline, bullets: bullets.slice(0, 3), homework };
}

function pickHomework(
  moments: KeyMoment[],
  moves: AnalyzedMove[]
): ReviewStory["homework"] {
  const priority = (km: KeyMoment) => {
    const rank =
      km.classification === "blunder"
        ? 4
        : km.classification === "mistake"
          ? 3
          : km.classification === "brilliant" || km.classification === "great"
            ? 2
            : 1;
    return rank * 10 + km.swing;
  };

  const picked = [...moments]
    .sort((a, b) => priority(b) - priority(a))
    .slice(0, 3);

  return picked.map((km) => {
    const m = moves[km.moveIdx];
    const meta = km.classification
      ? CLASSIFICATION_META[km.classification as keyof typeof CLASSIFICATION_META]
      : null;
    return {
      moveIdx: km.moveIdx,
      label: `${km.moveNumber}${km.color === "w" ? "." : "…"} ${km.san}${
        meta ? ` · ${meta.label}` : ""
      }`,
      fen: m?.fenBefore ?? "",
    };
  }).filter((h) => h.fen);
}

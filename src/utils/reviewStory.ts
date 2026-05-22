import type { AnalyzedMove, KeyMoment, ReviewSummary } from "../types";
import { CLASSIFICATION_META } from "./classificationMeta";

export type StorySide = "white" | "black";

export type StorySegment =
  | { kind: "text"; value: string }
  | { kind: "player"; name: string; side: StorySide }
  | {
      kind: "move";
      moveIdx: number;
      moveNumber: number;
      color: "w" | "b";
      san: string;
      classification?: string;
      swing?: number;
    };

export interface ReviewStory {
  headline: StorySegment[];
  bullets: StorySegment[][];
  homework: Array<{
    moveIdx: number;
    moveNumber: number;
    color: "w" | "b";
    san: string;
    classification?: string;
    label: string;
    fen: string;
  }>;
}

export const PLAYER_NAME_STYLE: Record<StorySide, { color: string; fontWeight: number }> = {
  white: { color: "#f2ede4", fontWeight: 600 },
  black: { color: "#c9a86c", fontWeight: 600 },
};

function storySeed(summary: ReviewSummary, moves: AnalyzedMove[]): number {
  let s = moves.length * 7;
  s += Math.round(summary.accuracy.white * 3 + summary.accuracy.black);
  s += (summary.white.blunder + summary.black.blunder) * 11;
  return Math.abs(s);
}

function pick<T>(seed: number, offset: number, options: T[]): T {
  return options[(seed + offset) % options.length]!;
}

function playerSeg(name: string, side: StorySide): StorySegment {
  return { kind: "player", name, side };
}

function textSeg(value: string): StorySegment {
  return { kind: "text", value };
}

function moveSeg(km: KeyMoment): StorySegment {
  return {
    kind: "move",
    moveIdx: km.moveIdx,
    moveNumber: km.moveNumber,
    color: km.color,
    san: km.san,
    classification: km.classification ?? undefined,
    swing: km.swing,
  };
}

function phaseLabel(phase: string): string {
  if (phase === "opening") return "the opening";
  if (phase === "endgame") return "the endgame";
  return "the middlegame";
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

function countMistakes(summary: ReviewSummary, side: "white" | "black"): number {
  const c = side === "white" ? summary.white : summary.black;
  return c.inaccuracy + c.mistake + c.blunder;
}

function swingWords(pawns: number): string {
  if (pawns >= 8) return "a huge swing";
  if (pawns >= 4) return "a sharp turn";
  return "a noticeable shift";
}

function buildHeadline(
  summary: ReviewSummary,
  whiteName: string,
  blackName: string,
  seed: number
): StorySegment[] {
  const wAcc = summary.accuracy.white;
  const bAcc = summary.accuracy.black;
  const wErr = countMistakes(summary, "white");
  const bErr = countMistakes(summary, "black");
  const gap = Math.abs(wAcc - bAcc);

  if (gap >= 12) {
    const betterSide: StorySide = wAcc > bAcc ? "white" : "black";
    const worseSide: StorySide = wAcc > bAcc ? "black" : "white";
    const better = betterSide === "white" ? whiteName : blackName;
    const worse = worseSide === "white" ? whiteName : blackName;
    const variants: StorySegment[][] = [
      [
        playerSeg(better, betterSide),
        textSeg(" had the steadier game — "),
        playerSeg(worse, worseSide),
        textSeg(" gave away more points along the way."),
      ],
      [
        textSeg("Accuracy tipped the scale toward "),
        playerSeg(better, betterSide),
        textSeg("; "),
        playerSeg(worse, worseSide),
        textSeg(" leaked more than they held."),
      ],
      [
        playerSeg(better, betterSide),
        textSeg(" outlasted "),
        playerSeg(worse, worseSide),
        textSeg(" on precision — not a blowout, but it showed."),
      ],
    ];
    return pick(seed, 0, variants);
  }

  if (wErr + bErr === 0) {
    const variants: StorySegment[][] = [
      [textSeg("A clean fight — hardly a serious misstep from either side.")],
      [textSeg("Both sides kept it tight; the eval never really ran away.")],
      [textSeg("Solid chess all around — few moments that truly hurt.")],
    ];
    return pick(seed, 1, variants);
  }

  if (wErr > bErr + 2) {
    const variants: StorySegment[][] = [
      [
        playerSeg(whiteName, "white"),
        textSeg(" had more costly slips than "),
        playerSeg(blackName, "black"),
        textSeg("."),
      ],
      [
        textSeg("The critical mistakes leaned toward "),
        playerSeg(whiteName, "white"),
        textSeg("."),
      ],
    ];
    return pick(seed, 2, variants);
  }

  if (bErr > wErr + 2) {
    const variants: StorySegment[][] = [
      [
        playerSeg(blackName, "black"),
        textSeg(" had more costly slips than "),
        playerSeg(whiteName, "white"),
        textSeg("."),
      ],
      [
        textSeg("The critical mistakes leaned toward "),
        playerSeg(blackName, "black"),
        textSeg("."),
      ],
    ];
    return pick(seed, 3, variants);
  }

  const variants: StorySegment[][] = [
    [textSeg("An even battle — both sides had their chances to take over.")],
    [textSeg("Neither player ran away with it; the game stayed in the balance.")],
    [textSeg("A close one: accuracy and mistakes mostly cancelled out.")],
  ];
  return pick(seed, 4, variants);
}

function buildPhaseBullet(
  summary: ReviewSummary,
  whiteName: string,
  blackName: string,
  seed: number
): StorySegment[] | null {
  const pa = summary.phaseAccuracy;
  if (!pa) return null;

  const wPhase = phaseGap(pa, "white");
  const bPhase = phaseGap(pa, "black");
  const candidates: Array<{
    side: StorySide;
    name: string;
    phase: string;
    gap: number;
    acc: number;
  }> = [];

  if (wPhase && wPhase.gap >= 10) {
    const acc =
      wPhase.phase === "opening"
        ? pa.opening.white
        : wPhase.phase === "middlegame"
          ? pa.middlegame.white
          : pa.endgame.white;
    candidates.push({
      side: "white",
      name: whiteName,
      phase: wPhase.phase,
      gap: wPhase.gap,
      acc,
    });
  }
  if (bPhase && bPhase.gap >= 10) {
    const acc =
      bPhase.phase === "opening"
        ? pa.opening.black
        : bPhase.phase === "middlegame"
          ? pa.middlegame.black
          : pa.endgame.black;
    candidates.push({
      side: "black",
      name: blackName,
      phase: bPhase.phase,
      gap: bPhase.gap,
      acc,
    });
  }

  if (candidates.length === 0) return null;
  const best = candidates.sort((a, b) => b.gap - a.gap)[0];
  const phaseName = phaseLabel(best.phase);
  const accRounded = best.acc.toFixed(0);

  const variants: StorySegment[][] = [
    [
      playerSeg(best.name, best.side),
      textSeg(` found their rhythm in ${phaseName} (${accRounded}% in that stretch).`),
    ],
    [
      textSeg(`${phaseName.charAt(0).toUpperCase() + phaseName.slice(1)} belonged to `),
      playerSeg(best.name, best.side),
      textSeg(` — about ${accRounded}% accuracy there.`),
    ],
    [
      playerSeg(best.name, best.side),
      textSeg(` was at their best in ${phaseName}; the rest of the game was closer.`),
    ],
  ];
  return pick(seed, 7, variants);
}

function buildSwingBullet(top: KeyMoment, seed: number): StorySegment[] {
  const meta = top.classification
    ? CLASSIFICATION_META[top.classification as keyof typeof CLASSIFICATION_META]
    : null;
  const tag = meta?.label?.toLowerCase() ?? "critical moment";
  const swingPhrase = swingWords(top.swing);

  const variants: StorySegment[][] = [
    [
      textSeg("The game pivoted on "),
      moveSeg(top),
      textSeg(` — ${tag}, ${swingPhrase} (±${top.swing.toFixed(1)} pawns).`),
    ],
    [
      textSeg("Nothing changed the eval quite like "),
      moveSeg(top),
      textSeg(` (${tag}; ±${top.swing.toFixed(1)}).`),
    ],
    [
      textSeg("If you replay one moment, make it "),
      moveSeg(top),
      textSeg(` — ${tag} and ${swingPhrase}.`),
    ],
  ];
  return pick(seed, 11, variants);
}

function buildBlunderBullet(
  summary: ReviewSummary,
  seed: number
): StorySegment[] | null {
  const n = summary.white.blunder + summary.black.blunder;
  if (n === 0) return null;
  const variants: StorySegment[][] = [
    [
      textSeg(
        `${n} blunder${n === 1 ? "" : "s"} in the mix — worth sitting with each position below.`
      ),
    ],
    [
      textSeg(
        `${n === 1 ? "One true blunder" : `${n} blunders`} — the replay buttons below jump to the exact ply.`
      ),
    ],
  ];
  return pick(seed, 13, variants);
}

export function buildReviewStory(
  summary: ReviewSummary,
  moves: AnalyzedMove[],
  whiteName: string,
  blackName: string
): ReviewStory {
  const seed = storySeed(summary, moves);
  const headline = buildHeadline(summary, whiteName, blackName, seed);

  const bullets: StorySegment[][] = [];
  const phaseBullet = buildPhaseBullet(summary, whiteName, blackName, seed);
  if (phaseBullet) bullets.push(phaseBullet);

  const moments = [...(summary.keyMoments ?? [])].sort((a, b) => b.swing - a.swing);
  const top = moments[0];
  if (top && bullets.length < 3) {
    bullets.push(buildSwingBullet(top, seed));
  }

  if (bullets.length < 3) {
    const blunderBullet = buildBlunderBullet(summary, seed);
    if (blunderBullet) bullets.push(blunderBullet);
  }

  if (bullets.length === 0) {
    bullets.push([
      textSeg("Step through the key moments below to see where the eval really moved."),
    ]);
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

  return picked
    .map((km) => {
      const m = moves[km.moveIdx];
      const meta = km.classification
        ? CLASSIFICATION_META[km.classification as keyof typeof CLASSIFICATION_META]
        : null;
      return {
        moveIdx: km.moveIdx,
        moveNumber: km.moveNumber,
        color: km.color,
        san: km.san,
        classification: km.classification ?? undefined,
        label: `${km.moveNumber}${km.color === "w" ? "." : "…"} ${km.san}${
          meta ? ` · ${meta.label}` : ""
        }`,
        fen: m?.fenBefore ?? "",
      };
    })
    .filter((h) => h.fen);
}

export function formatMoveLabel(moveNumber: number, color: "w" | "b", san: string): string {
  return `${moveNumber}${color === "w" ? "." : "…"}${san}`;
}

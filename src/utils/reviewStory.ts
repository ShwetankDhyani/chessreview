import type { AnalyzedMove, KeyMoment, ReviewSummary } from "../types";
import { CLASSIFICATION_META } from "./classificationMeta";

export type StorySide = "white" | "black";

export type StorySegment =
  | { kind: "text"; value: string }
  | { kind: "player"; name: string; side: StorySide }
  | {
      kind: "move";
      moveIdx: number;
      label: string;
      classification?: KeyMoment["classification"];
    };

export interface ReviewStory {
  body: StorySegment[];
}

function storySeed(summary: ReviewSummary, moves: AnalyzedMove[]): number {
  let s = moves.length * 7;
  s += Math.round(summary.accuracy.white * 3 + summary.accuracy.black);
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

function phaseEdge(
  pa: NonNullable<ReviewSummary["phaseAccuracy"]>,
  phase: "opening" | "middlegame" | "endgame",
  side: StorySide
): number {
  const other: StorySide = side === "white" ? "black" : "white";
  return pa[phase][side] - pa[phase][other];
}

function countMistakes(summary: ReviewSummary, side: StorySide): number {
  const c = side === "white" ? summary.white : summary.black;
  return c.inaccuracy + c.mistake + c.blunder;
}

function buildCollapseEarlyStory(
  leader: StorySide,
  whiteName: string,
  blackName: string,
  seed: number
): StorySegment[] {
  const leaderName = leader === "white" ? whiteName : blackName;
  const otherName = leader === "white" ? blackName : whiteName;
  const otherSide: StorySide = leader === "white" ? "black" : "white";
  return pick(seed, 0, [
    [
      playerSeg(leaderName, leader),
      textSeg(" had the better of the opening and middlegame, but "),
      playerSeg(otherName, otherSide),
      textSeg(" took over in the endgame — that's where it unraveled."),
    ],
    [
      playerSeg(leaderName, leader),
      textSeg(" were on top through the opening and middle game until "),
      playerSeg(otherName, otherSide),
      textSeg(" flipped the script in the endgame."),
    ],
    [
      textSeg("After a strong opening and middlegame from "),
      playerSeg(leaderName, leader),
      textSeg(", "),
      playerSeg(otherName, otherSide),
      textSeg(" stole the point late — the endgame cost them."),
    ],
  ]);
}

function buildLateComebackStory(
  hero: StorySide,
  whiteName: string,
  blackName: string,
  seed: number
): StorySegment[] {
  const heroName = hero === "white" ? whiteName : blackName;
  const foeName = hero === "white" ? blackName : whiteName;
  const foeSide: StorySide = hero === "white" ? "black" : "white";
  return pick(seed, 2, [
    [
      playerSeg(heroName, hero),
      textSeg(" were behind earlier, then found their footing in the endgame and turned the game around."),
    ],
    [
      textSeg("It looked rough for "),
      playerSeg(heroName, hero),
      textSeg(" in the early phases — they rallied in the endgame and made it count."),
    ],
    [
      playerSeg(foeName, foeSide),
      textSeg(" had the edge for much of the game, but "),
      playerSeg(heroName, hero),
      textSeg(" owned the endgame when it mattered."),
    ],
  ]);
}

function buildEndgameDeciderStory(
  whiteName: string,
  blackName: string,
  endLeader: StorySide,
  seed: number
): StorySegment[] {
  const leaderName = endLeader === "white" ? whiteName : blackName;
  const otherName = endLeader === "white" ? blackName : whiteName;
  const otherSide: StorySide = endLeader === "white" ? "black" : "white";
  return pick(seed, 4, [
    [
      textSeg("The opening and middlegame stayed level — "),
      playerSeg(leaderName, endLeader),
      textSeg(" made the difference in the endgame."),
    ],
    [
      textSeg("Neither side pulled away early; "),
      playerSeg(leaderName, endLeader),
      textSeg(" were sharper when the endgame arrived."),
    ],
    [
      playerSeg(otherName, otherSide),
      textSeg(" and "),
      playerSeg(leaderName, endLeader),
      textSeg(" traded blows until the endgame, where "),
      playerSeg(leaderName, endLeader),
      textSeg(" took control."),
    ],
  ]);
}

function buildSteadyDominanceStory(
  leader: StorySide,
  whiteName: string,
  blackName: string,
  seed: number
): StorySegment[] {
  const leaderName = leader === "white" ? whiteName : blackName;
  const otherName = leader === "white" ? blackName : whiteName;
  const otherSide: StorySide = leader === "white" ? "black" : "white";
  return pick(seed, 6, [
    [
      playerSeg(leaderName, leader),
      textSeg(" were on a different level from start to finish — a one-sided affair on accuracy."),
    ],
    [
      textSeg("A mismatch: "),
      playerSeg(leaderName, leader),
      textSeg(" played in a different league; "),
      playerSeg(otherName, otherSide),
      textSeg(" never got into the game on precision."),
    ],
    [
      playerSeg(leaderName, leader),
      textSeg(" dominated every phase — "),
      playerSeg(otherName, otherSide),
      textSeg(" were outclassed, not just edged out."),
    ],
  ]);
}

function buildMiddlegameSwingStory(
  leader: StorySide,
  whiteName: string,
  blackName: string,
  seed: number
): StorySegment[] {
  const leaderName = leader === "white" ? whiteName : blackName;
  return pick(seed, 8, [
    [
      textSeg("The opening was balanced, but "),
      playerSeg(leaderName, leader),
      textSeg(" seized the middlegame and never let go."),
    ],
    [
      playerSeg(leaderName, leader),
      textSeg(" took charge in the middlegame — that stretch decided the game."),
    ],
  ]);
}

function buildEvenStory(
  whiteName: string,
  blackName: string,
  seed: number
): StorySegment[] {
  return pick(seed, 10, [
    [
      textSeg("A tight game — "),
      playerSeg(whiteName, "white"),
      textSeg(" and "),
      playerSeg(blackName, "black"),
      textSeg(" stayed close on accuracy with no clear phase winner."),
    ],
    [
      playerSeg(whiteName, "white"),
      textSeg(" and "),
      playerSeg(blackName, "black"),
      textSeg(" matched each other; small details rather than one phase decided it."),
    ],
    [
      textSeg("Neither player ran away with a phase — a balanced fight from start to finish."),
    ],
  ]);
}

function buildOverallAccuracyStory(
  leader: StorySide,
  whiteName: string,
  blackName: string,
  seed: number,
  accGap: number
): StorySegment[] {
  const leaderName = leader === "white" ? whiteName : blackName;
  const otherName = leader === "white" ? blackName : whiteName;
  const otherSide: StorySide = leader === "white" ? "black" : "white";

  if (accGap >= 15) {
    return pick(seed, 12, [
      [
        playerSeg(leaderName, leader),
        textSeg(" were in a different league on accuracy — a one-sided affair."),
      ],
      [
        textSeg("Not close on precision: "),
        playerSeg(leaderName, leader),
        textSeg(" outclassed "),
        playerSeg(otherName, otherSide),
        textSeg(" from start to finish."),
      ],
      [
        playerSeg(otherName, otherSide),
        textSeg(" were outmatched — "),
        playerSeg(leaderName, leader),
        textSeg(" played on another level."),
      ],
    ]);
  }

  return pick(seed, 12, [
    [
      playerSeg(leaderName, leader),
      textSeg(" were more accurate overall, while "),
      playerSeg(otherName, otherSide),
      textSeg(" had the bigger slips."),
    ],
    [
      textSeg("On pure precision, "),
      playerSeg(leaderName, leader),
      textSeg(" had the upper hand over "),
      playerSeg(otherName, otherSide),
      textSeg("."),
    ],
  ]);
}

function buildCleanStory(seed: number): StorySegment[] {
  return pick(seed, 14, [
    [textSeg("A clean game — very few serious mistakes from either side.")],
    [textSeg("Solid chess throughout; neither side gave much away.")],
  ]);
}

type GameMargin = "close" | "modest" | "wide";

function gameMargin(accGap: number): GameMargin {
  if (accGap < 8) return "close";
  if (accGap < 15) return "modest";
  return "wide";
}

function moveNotation(km: KeyMoment): string {
  return `${km.moveNumber}${km.color === "w" ? "." : "…"}${km.san}`;
}

function moveSeg(km: KeyMoment): StorySegment {
  return {
    kind: "move",
    moveIdx: km.moveIdx,
    label: moveNotation(km),
    classification: km.classification ?? undefined,
  };
}

/** Skip mate delivery, terminal moves, and wins masquerading as "decisive slips". */
function isStoryWorthyMoment(km: KeyMoment, moves: AnalyzedMove[]): boolean {
  if (/#|\+\+?\s*$/.test(km.san)) return false;

  const m = moves[km.moveIdx];
  if (!m) return false;
  if (km.moveIdx >= moves.length - 1) return false;

  if (m.evalAfter?.mate !== undefined && Math.abs(m.evalAfter.mate) <= 1) {
    return false;
  }
  if (m.evalBefore?.mate !== undefined && Math.abs(m.evalBefore.mate) <= 1) {
    return false;
  }

  const isSlip =
    km.classification === "blunder" ||
    km.classification === "mistake" ||
    km.classification === "inaccuracy";

  if (km.classification === "brilliant" || km.classification === "great") {
    return false;
  }

  if (!isSlip && m.deltaE < 0.8) return false;

  return m.deltaE >= 0.5;
}

function pickDecisiveMoment(
  moments: KeyMoment[],
  moves: AnalyzedMove[]
): KeyMoment | null {
  const priority = (km: KeyMoment) => {
    const rank =
      km.classification === "blunder"
        ? 4
        : km.classification === "mistake"
          ? 3
          : km.classification === "inaccuracy"
            ? 2
            : 0;
    const m = moves[km.moveIdx];
    return rank * 100 + km.swing + (m?.deltaE ?? 0);
  };

  const eligible = moments.filter((km) => isStoryWorthyMoment(km, moves));
  if (eligible.length === 0) return null;
  return [...eligible].sort((a, b) => priority(b) - priority(a))[0]!;
}

function slipLabel(classification: KeyMoment["classification"]): string {
  if (!classification) return "critical slip";
  const meta = CLASSIFICATION_META[classification as keyof typeof CLASSIFICATION_META];
  return meta?.label.toLowerCase() ?? "mistake";
}

function swingPhrase(pawns: number): string {
  const n = Math.round(pawns);
  if (n >= 10) return `about ${n} pawns of eval`;
  if (n >= 5) return `roughly ${n} pawns of eval`;
  if (n >= 2) return `a ${n}-pawn swing`;
  return "a small eval shift";
}

function buildKeyPoint(
  summary: ReviewSummary,
  moves: AnalyzedMove[],
  whiteName: string,
  blackName: string,
  seed: number
): StorySegment[] {
  const wAcc = summary.accuracy.white;
  const bAcc = summary.accuracy.black;
  const accGap = Math.abs(wAcc - bAcc);
  const margin = gameMargin(accGap);
  const accLeader: StorySide = wAcc >= bAcc ? "white" : "black";
  const leaderName = accLeader === "white" ? whiteName : blackName;
  const trailerName = accLeader === "white" ? blackName : whiteName;
  const trailerSide: StorySide = accLeader === "white" ? "black" : "white";

  const moments = [...(summary.keyMoments ?? [])];
  const top = pickDecisiveMoment(moments, moves);
  const wSlips = countMistakes(summary, "white");
  const bSlips = countMistakes(summary, "black");

  if (top && top.swing >= 1.5) {
    const culprit: StorySide = top.color === "w" ? "white" : "black";
    const culpritName = culprit === "white" ? whiteName : blackName;
    const slip = slipLabel(top.classification);
    const swing = swingPhrase(top.swing);

    if (margin === "close") {
      return pick(seed, 20, [
        [
          textSeg("What decided it was "),
          moveSeg(top),
          textSeg(" — "),
          playerSeg(culpritName, culprit),
          textSeg(`'s ${slip} (${swing}) in an otherwise close game.`),
        ],
        [
          textSeg("The turning point: "),
          moveSeg(top),
          textSeg(", a "),
          textSeg(slip),
          textSeg(" from "),
          playerSeg(culpritName, culprit),
          textSeg(` worth ${swing} — small margins until then.`),
        ],
      ]);
    }

    if (margin === "wide") {
      return pick(seed, 22, [
        [
          textSeg("On top of a one-sided accuracy gap, "),
          moveSeg(top),
          textSeg(" was the headline — "),
          playerSeg(culpritName, culprit),
          textSeg(`'s ${slip} (${swing}) in a game `),
          playerSeg(leaderName, accLeader),
          textSeg(" were already winning on precision."),
        ],
        [
          playerSeg(leaderName, accLeader),
          textSeg(" were in a different league; "),
          moveSeg(top),
          textSeg(" just made it louder — a "),
          textSeg(slip),
          textSeg(` worth ${swing}.`),
        ],
        [
          textSeg("Not a close contest: "),
          playerSeg(leaderName, accLeader),
          textSeg(" dominated accuracy, and "),
          moveSeg(top),
          textSeg(" was the biggest real swing."),
        ],
      ]);
    }

    return pick(seed, 24, [
      [
        textSeg("The difference showed clearest on "),
        moveSeg(top),
        textSeg(" — "),
        playerSeg(culpritName, culprit),
        textSeg(`'s ${slip} (${swing}).`),
      ],
      [
        textSeg("That swung it: "),
        moveSeg(top),
        textSeg(", a "),
        textSeg(slip),
        textSeg(" from "),
        playerSeg(culpritName, culprit),
        textSeg(` worth ${swing}.`),
      ],
    ]);
  }

  if (margin === "close") {
    if (wSlips !== bSlips) {
      const moreSide: StorySide = wSlips > bSlips ? "white" : "black";
      const moreName = moreSide === "white" ? whiteName : blackName;
      const fewerName = moreSide === "white" ? blackName : whiteName;
      const fewerSide: StorySide = moreSide === "white" ? "black" : "white";
      return pick(seed, 26, [
        [
          textSeg("No single meltdown — "),
          playerSeg(moreName, moreSide),
          textSeg(" had a few more slips than "),
          playerSeg(fewerName, fewerSide),
          textSeg(", and that was enough in a tight game."),
        ],
        [
          textSeg("It stayed close on accuracy; "),
          playerSeg(moreName, moreSide),
          textSeg("'s extra inaccuracies edged "),
          playerSeg(fewerName, fewerSide),
          textSeg(" out."),
        ],
      ]);
    }
    return pick(seed, 28, [
      [
        textSeg("Hard to split them on accuracy — the result likely came down to one or two moments below."),
      ],
      [
        textSeg("Neck-and-neck on precision; check key moments for where the eval actually moved."),
      ],
    ]);
  }

  if (margin === "wide") {
    return pick(seed, 30, [
      [
        textSeg("Bottom line: "),
        playerSeg(leaderName, accLeader),
        textSeg(` at ${wAcc.toFixed(0)}% vs `),
        playerSeg(trailerName, trailerSide),
        textSeg(`${bAcc.toFixed(0)}% — `),
        playerSeg(leaderName, accLeader),
        textSeg(" were on a different level; a one-sided affair."),
      ],
      [
        playerSeg(trailerName, trailerSide),
        textSeg(" were outclassed on accuracy ("),
        textSeg(`${accGap.toFixed(0)} points`),
        textSeg(") — not really a fair fight on precision."),
      ],
      [
        textSeg("This wasn't close: "),
        playerSeg(leaderName, accLeader),
        textSeg(" played in a different league, and "),
        playerSeg(trailerName, trailerSide),
        textSeg(" never matched it."),
      ],
    ]);
  }

  return pick(seed, 32, [
    [
      textSeg("Overall, "),
      playerSeg(leaderName, accLeader),
      textSeg(" were sharper ("),
      textSeg(`${wAcc.toFixed(0)}% vs ${bAcc.toFixed(0)}%`),
      textSeg(") — the margin was real but not a blowout."),
    ],
    [
      playerSeg(leaderName, accLeader),
      textSeg(" had the edge on accuracy; "),
      playerSeg(trailerName, trailerSide),
      textSeg(" needed cleaner play in the critical spots."),
    ],
  ]);
}

function joinParagraph(arc: StorySegment[], keyPoint: StorySegment[]): StorySegment[] {
  return [...arc, textSeg(" "), ...keyPoint];
}

function buildNarrativeBody(
  summary: ReviewSummary,
  whiteName: string,
  blackName: string,
  seed: number
): StorySegment[] {
  const pa = summary.phaseAccuracy;
  const wAcc = summary.accuracy.white;
  const bAcc = summary.accuracy.black;
  const wErr = countMistakes(summary, "white");
  const bErr = countMistakes(summary, "black");

  if (wErr + bErr === 0) {
    return buildCleanStory(seed);
  }

  if (pa) {
    const wOpen = phaseEdge(pa, "opening", "white");
    const wMid = phaseEdge(pa, "middlegame", "white");
    const wEnd = phaseEdge(pa, "endgame", "white");
    const bOpen = phaseEdge(pa, "opening", "black");
    const bMid = phaseEdge(pa, "middlegame", "black");
    const bEnd = phaseEdge(pa, "endgame", "black");

    const whiteEarly = wOpen >= 8 && wMid >= 8;
    const blackEarly = bOpen >= 8 && bMid >= 8;
    const whiteEndCollapse = wEnd <= -10;
    const blackEndCollapse = bEnd <= -10;
    const whiteEndSurge = wEnd >= 10;
    const blackEndSurge = bEnd >= 10;
    const whiteEarlyStruggle = wOpen <= -8 && wMid <= -8;
    const blackEarlyStruggle = bOpen <= -8 && bMid <= -8;

    if (whiteEarly && whiteEndCollapse) {
      return buildCollapseEarlyStory("white", whiteName, blackName, seed);
    }
    if (blackEarly && blackEndCollapse) {
      return buildCollapseEarlyStory("black", whiteName, blackName, seed);
    }

    if (whiteEndSurge && (blackEarly || blackEarlyStruggle || bOpen >= 6)) {
      return buildLateComebackStory("white", whiteName, blackName, seed);
    }
    if (blackEndSurge && (whiteEarly || whiteEarlyStruggle || wOpen >= 6)) {
      return buildLateComebackStory("black", whiteName, blackName, seed);
    }

    const openFlat = Math.abs(wOpen) < 8;
    const midFlat = Math.abs(wMid) < 8;
    if (openFlat && midFlat && Math.abs(wEnd) >= 12) {
      const endLeader: StorySide = wEnd >= 0 ? "white" : "black";
      return buildEndgameDeciderStory(whiteName, blackName, endLeader, seed);
    }

    if (wOpen >= 6 && wMid >= 6 && wEnd >= 5) {
      return buildSteadyDominanceStory("white", whiteName, blackName, seed);
    }
    if (bOpen >= 6 && bMid >= 6 && bEnd >= 5) {
      return buildSteadyDominanceStory("black", whiteName, blackName, seed);
    }

    if (Math.abs(wOpen) < 8 && Math.abs(wEnd) < 8 && wMid >= 12) {
      return buildMiddlegameSwingStory("white", whiteName, blackName, seed);
    }
    if (Math.abs(bOpen) < 8 && Math.abs(bEnd) < 8 && bMid >= 12) {
      return buildMiddlegameSwingStory("black", whiteName, blackName, seed);
    }

    if (Math.abs(wOpen) < 8 && Math.abs(wMid) < 8 && Math.abs(wEnd) < 8) {
      return buildEvenStory(whiteName, blackName, seed);
    }
  }

  const accGap = Math.abs(wAcc - bAcc);
  if (accGap >= 12) {
    const leader: StorySide = wAcc > bAcc ? "white" : "black";
    return buildOverallAccuracyStory(leader, whiteName, blackName, seed, accGap);
  }

  return buildEvenStory(whiteName, blackName, seed);
}

export function buildReviewStory(
  summary: ReviewSummary,
  moves: AnalyzedMove[],
  whiteName: string,
  blackName: string
): ReviewStory {
  const seed = storySeed(summary, moves);
  const arc = buildNarrativeBody(summary, whiteName, blackName, seed);
  const keyPoint = buildKeyPoint(summary, moves, whiteName, blackName, seed);
  return {
    body: joinParagraph(arc, keyPoint),
  };
}

import type { AnalyzedMove, ReviewSummary } from "../types";

export type StorySide = "white" | "black";

export type StorySegment =
  | { kind: "text"; value: string }
  | { kind: "player"; name: string; side: StorySide };

export interface ReviewStory {
  body: StorySegment[];
}

export const PLAYER_NAME_STYLE: Record<StorySide, { color: string; fontWeight: number }> = {
  white: { color: "#f2ede4", fontWeight: 600 },
  black: { color: "#c9a86c", fontWeight: 600 },
};

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
      textSeg(" were the steadier side from start to finish — "),
      playerSeg(otherName, otherSide),
      textSeg(" never quite matched their accuracy."),
    ],
    [
      playerSeg(leaderName, leader),
      textSeg(" held the edge across the whole game; "),
      playerSeg(otherName, otherSide),
      textSeg(" couldn't close the gap."),
    ],
    [
      textSeg("A one-sided story on accuracy: "),
      playerSeg(leaderName, leader),
      textSeg(" outplayed "),
      playerSeg(otherName, otherSide),
      textSeg(" in every phase that mattered."),
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
  seed: number
): StorySegment[] {
  const leaderName = leader === "white" ? whiteName : blackName;
  const otherName = leader === "white" ? blackName : whiteName;
  const otherSide: StorySide = leader === "white" ? "black" : "white";
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
    return buildOverallAccuracyStory(leader, whiteName, blackName, seed);
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
  return {
    body: buildNarrativeBody(summary, whiteName, blackName, seed),
  };
}

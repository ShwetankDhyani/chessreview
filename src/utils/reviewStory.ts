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
  return pick(seed, 0, [
    [
      playerSeg(leaderName, leader),
      textSeg(" led through the opening and middlegame, then lost the endgame — a late collapse."),
    ],
    [
      textSeg("Strong opening and middle game, then the endgame flipped — that's where it unraveled."),
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
  return pick(seed, 2, [
    [
      playerSeg(heroName, hero),
      textSeg(" were behind earlier, then owned the endgame and turned it around."),
    ],
    [
      textSeg("Rough early phases, but the endgame rescue decided it."),
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
  return pick(seed, 4, [
    [
      textSeg("Opening and middlegame were level — "),
      playerSeg(leaderName, endLeader),
      textSeg(" took over in the endgame."),
    ],
    [
      textSeg("Even through the middle game; the endgame is where it broke."),
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
  return pick(seed, 6, [
    [
      playerSeg(leaderName, leader),
      textSeg(" were on a different level from start to finish — a one-sided affair."),
    ],
    [
      textSeg("A mismatch on accuracy — one side in another league, start to finish."),
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
  _whiteName: string,
  _blackName: string,
  seed: number
): StorySegment[] {
  return pick(seed, 10, [
    [textSeg("A tight game on accuracy — no clear phase edge.")],
    [textSeg("Matched each other on precision; small details decided it.")],
    [textSeg("Balanced fight from start to finish — neither side ran away with a phase.")],
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

  if (accGap >= 15) {
    return pick(seed, 12, [
      [
        playerSeg(leaderName, leader),
        textSeg(" were in a different league on accuracy — a one-sided affair."),
      ],
      [textSeg("Not close on precision — one side outclassed the other throughout.")],
    ]);
  }

  return pick(seed, 12, [
    [
      playerSeg(leaderName, leader),
      textSeg(" were sharper overall; the bigger slips came from the other side."),
    ],
    [textSeg("A real edge on precision, if not a blowout.")],
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

function sideLabel(side: StorySide): string {
  return side === "white" ? "White" : "Black";
}

function evalCpWhite(m: AnalyzedMove, when: "before" | "after"): number | null {
  const ev = when === "before" ? m.evalBefore : m.evalAfter;
  if (!ev) return null;
  if (ev.mate !== undefined) {
    if (ev.mate > 0) return 12;
    if (ev.mate < 0) return -12;
    return 0;
  }
  return (ev.cp ?? 0) / 100;
}

interface StructuralTurn {
  moveIdx: number;
  sideGained: StorySide;
  shiftPawns: number;
  heldRatio: number;
  score: number;
}

/**
 * Find when the eval crossed and stayed on one side — earlier than a late blunder.
 */
function pickStructuralTurningPoint(moves: AnalyzedMove[]): StructuralTurn | null {
  const OPENING_SKIP = 6;
  const CONTESTABLE = 2.0;
  const HELD_CP = 1.0;
  const MIN_SWING = 1.2;
  const MIN_HELD = 0.68;
  const MIN_TAIL = 5;

  let best: StructuralTurn | null = null;

  for (let i = OPENING_SKIP; i < moves.length - MIN_TAIL; i++) {
    const m = moves[i];
    if (/#|\+\+?\s*$/.test(m.san)) continue;

    const cpBefore = evalCpWhite(m, "before");
    const cpAfter = evalCpWhite(m, "after");
    if (cpBefore === null || cpAfter === null) continue;
    if (Math.abs(cpBefore) > CONTESTABLE) continue;

    const swing = cpAfter - cpBefore;
    if (Math.abs(swing) < MIN_SWING && Math.abs(cpAfter) < HELD_CP + 0.5) {
      continue;
    }

    const leaderSign = cpAfter >= 0 ? 1 : -1;
    const sideGained: StorySide = cpAfter >= 0 ? "white" : "black";

    let held = 0;
    let total = 0;
    for (let j = i + 1; j < moves.length; j++) {
      const cp = evalCpWhite(moves[j], "after");
      if (cp === null) continue;
      total++;
      if (leaderSign * cp >= HELD_CP) held++;
    }
    if (total < MIN_TAIL) continue;

    const heldRatio = held / total;
    if (heldRatio < MIN_HELD) continue;

    let score = heldRatio * 60 + Math.abs(swing) * 8 + Math.abs(cpAfter) * 3;
    score -= i * 0.15;
    if (
      m.classification === "blunder" ||
      m.classification === "mistake" ||
      m.classification === "inaccuracy"
    ) {
      score += 6;
    }
    if (m.deltaE >= 0.8) score += 4;

    if (!best || score > best.score) {
      best = {
        moveIdx: i,
        sideGained,
        shiftPawns: Math.abs(swing),
        heldRatio,
        score,
      };
    }
  }

  return best;
}

function structuralToKeyMoment(turn: StructuralTurn, moves: AnalyzedMove[]): KeyMoment {
  const m = moves[turn.moveIdx];
  return {
    moveIdx: turn.moveIdx,
    san: m.san,
    moveNumber: m.moveNumber,
    color: m.color,
    classification: m.classification,
    swing: turn.shiftPawns,
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

function pickTurningPoint(
  moments: KeyMoment[],
  moves: AnalyzedMove[]
): { moment: KeyMoment; structural: boolean } | null {
  const structural = pickStructuralTurningPoint(moves);
  const slip = pickDecisiveMoment(moments, moves);

  if (structural) {
    const km = structuralToKeyMoment(structural, moves);
    if (!slip || structural.moveIdx <= slip.moveIdx) {
      return { moment: km, structural: true };
    }
    if (structural.heldRatio >= 0.74 && slip.moveIdx - structural.moveIdx >= 4) {
      return { moment: km, structural: true };
    }
  }

  if (slip) return { moment: slip, structural: false };
  return null;
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

  const moments = [...(summary.keyMoments ?? [])];
  const turn = pickTurningPoint(moments, moves);
  const wSlips = countMistakes(summary, "white");
  const bSlips = countMistakes(summary, "black");

  if (turn && turn.moment.swing >= 1) {
    const top = turn.moment;

    if (turn.structural) {
      const structural = pickStructuralTurningPoint(moves)!;
      const gained = sideLabel(structural.sideGained);

      if (margin === "close") {
        return pick(seed, 20, [
          [
            textSeg("The game tipped on "),
            moveSeg(top),
            textSeg(` — after that ${gained} kept a firm grip; the rest was holding on.`),
          ],
          [
            textSeg("From "),
            moveSeg(top),
            textSeg(` onward the eval never really came back — decided well before the late noise.`),
          ],
        ]);
      }

      if (margin === "wide") {
        return pick(seed, 22, [
          [
            textSeg("It was already lopsided, but "),
            moveSeg(top),
            textSeg(` is where the door closed — ${gained} never gave it back.`),
          ],
          [
            textSeg("The line broke on "),
            moveSeg(top),
            textSeg(`; from there ${gained} stayed in control.`),
          ],
        ]);
      }

      return pick(seed, 24, [
        [
          textSeg("The decisive shift was "),
          moveSeg(top),
          textSeg(` — ${gained} took over and the position never equalized.`),
        ],
        [
          textSeg("After "),
          moveSeg(top),
          textSeg(`, the game stayed in one camp; later slips only piled on.`),
        ],
      ]);
    }

    const slip = slipLabel(top.classification);
    const swing = swingPhrase(top.swing);

    if (margin === "close") {
      return pick(seed, 26, [
        [
          textSeg("The turning point was "),
          moveSeg(top),
          textSeg(` — a ${slip} (${swing}) in an otherwise close game.`),
        ],
        [
          textSeg("What hurt most: "),
          moveSeg(top),
          textSeg(`, a ${slip} worth ${swing}.`),
        ],
      ]);
    }

    if (margin === "wide") {
      return pick(seed, 28, [
        [
          textSeg("Already one-sided — "),
          moveSeg(top),
          textSeg(` stands out as a ${slip} (${swing}).`),
        ],
        [
          textSeg("The clearest slip was "),
          moveSeg(top),
          textSeg(` (${swing}), on top of a wide accuracy gap.`),
        ],
      ]);
    }

    return pick(seed, 30, [
      [
        textSeg("The difference showed on "),
        moveSeg(top),
        textSeg(` — a ${slip} (${swing}).`),
      ],
    ]);
  }

  if (margin === "close") {
    if (wSlips !== bSlips) {
      const moreSide: StorySide = wSlips > bSlips ? "white" : "black";
      const moreLabel = sideLabel(moreSide);
      return pick(seed, 32, [
        [
          textSeg(`No single meltdown — ${moreLabel} had a few more slips, enough in a tight game.`),
        ],
        [
          textSeg("Close on accuracy; the extra inaccuracies were the difference."),
        ],
      ]);
    }
    return pick(seed, 34, [
      [
        textSeg("Hard to split on accuracy — see key moments for where the eval moved."),
      ],
    ]);
  }

  if (margin === "wide") {
    const leaderLabel = sideLabel(accLeader);
    return pick(seed, 36, [
      [
        textSeg(`Bottom line: ${leaderLabel} at ${wAcc.toFixed(0)}% vs ${bAcc.toFixed(0)}% — a different level, one-sided on precision.`),
      ],
      [
        textSeg(`Not a fair fight on accuracy (${accGap.toFixed(0)} points) — ${leaderLabel} outclassed their opponent.`),
      ],
    ]);
  }

  return pick(seed, 38, [
    [
      textSeg(`Sharper overall (${wAcc.toFixed(0)}% vs ${bAcc.toFixed(0)}%) — real edge, not a blowout.`),
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

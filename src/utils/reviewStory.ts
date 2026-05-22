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
  /** One or two short lines — each renders as its own paragraph. */
  lines: StorySegment[][];
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

type SituationKind = "gift" | "structural" | "earned_wide" | "close_fight" | "even";

interface GameSituation {
  kind: SituationKind;
  moment: KeyMoment | null;
  beneficiary: StorySide;
  contestableBefore: boolean;
  winnerSlipsNear: boolean;
  maxSwing: number;
}

function maxSwingInGame(moments: KeyMoment[], moves: AnalyzedMove[]): number {
  let max = 1;
  for (const km of moments) max = Math.max(max, km.swing);
  for (const m of moves) max = Math.max(max, Math.abs(m.deltaE));
  return max;
}

function beneficiaryOf(moment: KeyMoment): StorySide {
  return moment.color === "w" ? "black" : "white";
}

function hadRecentSlipBy(
  moves: AnalyzedMove[],
  beforeIdx: number,
  color: "w" | "b"
): boolean {
  const start = Math.max(0, beforeIdx - 4);
  for (let i = start; i < beforeIdx; i++) {
    const m = moves[i];
    if (m.color !== color) continue;
    if (
      m.classification === "mistake" ||
      m.classification === "inaccuracy" ||
      m.classification === "blunder"
    ) {
      return true;
    }
  }
  return false;
}

function isGiftDecisive(
  moment: KeyMoment,
  moves: AnalyzedMove[],
  maxSwing: number
): boolean {
  const m = moves[moment.moveIdx];
  if (!m) return false;
  const cpBefore = evalCpWhite(m, "before");
  if (cpBefore === null) return false;

  const contestable = Math.abs(cpBefore) <= 2.2;
  const bigSwing = moment.swing >= Math.max(3.5, maxSwing * 0.55);
  const isSlip =
    moment.classification === "blunder" ||
    moment.classification === "mistake";

  return contestable && bigSwing && isSlip;
}

function analyzeGameSituation(
  summary: ReviewSummary,
  moves: AnalyzedMove[],
  turnWrap: { moment: KeyMoment; structural: boolean } | null,
  structural: StructuralTurn | null
): GameSituation {
  const moments = summary.keyMoments ?? [];
  const maxSwing = maxSwingInGame(moments, moves);
  const wAcc = summary.accuracy.white;
  const bAcc = summary.accuracy.black;
  const accGap = Math.abs(wAcc - bAcc);
  const accLeader: StorySide = wAcc >= bAcc ? "white" : "black";

  if (!turnWrap) {
    if (accGap >= 15) {
      return {
        kind: "earned_wide",
        moment: null,
        beneficiary: accLeader,
        contestableBefore: false,
        winnerSlipsNear: false,
        maxSwing,
      };
    }
    if (accGap < 8) {
      return {
        kind: "even",
        moment: null,
        beneficiary: accLeader,
        contestableBefore: true,
        winnerSlipsNear: false,
        maxSwing,
      };
    }
    return {
      kind: "close_fight",
      moment: null,
      beneficiary: accLeader,
      contestableBefore: true,
      winnerSlipsNear: false,
      maxSwing,
    };
  }

  const moment = turnWrap.moment;
  const m = moves[moment.moveIdx];
  const cpBefore = m ? evalCpWhite(m, "before") : null;
  const contestableBefore = cpBefore !== null && Math.abs(cpBefore) <= 2.2;
  const beneficiary = beneficiaryOf(moment);
  const winnerColor = beneficiary === "white" ? "w" : "b";
  const winnerSlipsNear = hadRecentSlipBy(moves, moment.moveIdx, winnerColor);

  if (isGiftDecisive(moment, moves, maxSwing)) {
    return {
      kind: "gift",
      moment,
      beneficiary,
      contestableBefore,
      winnerSlipsNear,
      maxSwing,
    };
  }

  if (
    turnWrap.structural &&
    structural &&
    structural.heldRatio >= 0.72 &&
    moment.swing < maxSwing * 0.55
  ) {
    return {
      kind: "structural",
      moment,
      beneficiary: structural.sideGained,
      contestableBefore,
      winnerSlipsNear,
      maxSwing,
    };
  }

  if (accGap >= 15 && !contestableBefore) {
    return {
      kind: "earned_wide",
      moment,
      beneficiary: accLeader,
      contestableBefore,
      winnerSlipsNear,
      maxSwing,
    };
  }

  return {
    kind: "close_fight",
    moment,
    beneficiary,
    contestableBefore,
    winnerSlipsNear,
    maxSwing,
  };
}

/**
 * Find when the eval crossed and stayed on one side — not a single hanging blunder.
 */
function pickStructuralTurningPoint(
  moves: AnalyzedMove[],
  maxSwing: number
): StructuralTurn | null {
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

    const plySwing = Math.abs(swing);
    if (
      m.classification === "blunder" &&
      plySwing >= maxSwing * 0.55 &&
      m.deltaE >= maxSwing * 0.5
    ) {
      continue;
    }

    let score = heldRatio * 60 + plySwing * 8 + Math.abs(cpAfter) * 3;
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
  const maxSwing = maxSwingInGame(moments, moves);
  const structural = pickStructuralTurningPoint(moves, maxSwing);
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

function swingPhraseShort(pawns: number): string {
  const n = Math.max(1, Math.round(pawns));
  if (n === 1) return "about one pawn of eval";
  return `about ${n} pawns of eval`;
}

function accuracyLine(wAcc: number, bAcc: number): StorySegment[] {
  return [textSeg(`Accuracy: ${wAcc.toFixed(0)}% vs ${bAcc.toFixed(0)}%.`)];
}

function composeStory(
  summary: ReviewSummary,
  moves: AnalyzedMove[],
  whiteName: string,
  blackName: string,
  seed: number
): StorySegment[][] {
  const wAcc = summary.accuracy.white;
  const bAcc = summary.accuracy.black;
  const accLeader: StorySide = wAcc >= bAcc ? "white" : "black";
  const leaderName = accLeader === "white" ? whiteName : blackName;
  const wErr = countMistakes(summary, "white");
  const bErr = countMistakes(summary, "black");
  if (wErr + bErr === 0) {
    return [buildCleanStory(seed)];
  }

  const moments = [...(summary.keyMoments ?? [])];
  const turnWrap = pickTurningPoint(moments, moves);
  const structural = pickStructuralTurningPoint(
    moves,
    maxSwingInGame(moments, moves)
  );
  const sit = analyzeGameSituation(summary, moves, turnWrap, structural);

  if (sit.kind === "gift" && sit.moment) {
    const km = sit.moment;
    const slip = slipLabel(km.classification);
    const swing = swingPhraseShort(km.swing);

    if (sit.winnerSlipsNear) {
      return pick(seed, 0, [
        [
          [
            textSeg("Chances on both sides until "),
            moveSeg(km),
            textSeg(` — a ${slip} (${swing}) that decided the game.`),
          ],
          [
            textSeg(
              `Accuracy (${wAcc.toFixed(0)}% vs ${bAcc.toFixed(0)}%) looks lopsided, but one move did most of the damage.`
            ),
          ],
        ],
        [
          [
            textSeg("Still a fight before "),
            moveSeg(km),
            textSeg(`; that ${slip} (${swing}) is what separated the players.`),
          ],
          [
            textSeg(
              `The numbers favor the winner — mostly because of that swing, not a full-game crush.`
            ),
          ],
        ],
      ]);
    }

    return pick(seed, 2, [
      [
        [
          textSeg("The game was still contestable, then "),
          moveSeg(km),
          textSeg(` — a ${slip} (${swing}) that decided it.`),
        ],
        [
          textSeg(
            `Accuracy reads ${wAcc.toFixed(0)}% vs ${bAcc.toFixed(0)}%; the gap is mostly that one disaster, not sustained dominance.`
          ),
        ],
      ],
      [
        [
          textSeg("Not one-sided until "),
          moveSeg(km),
          textSeg(` — opponent's ${slip} (${swing}) handed over the game.`),
        ],
        [
          textSeg(
            `After that the eval never came back; the rest was conversion, not a different league.`
          ),
        ],
      ],
    ]);
  }

  if (sit.kind === "structural" && sit.moment) {
    const km = sit.moment;
    const slip = slipLabel(km.classification);
    const swing = swingPhraseShort(km.swing);
    const gained = sideLabel(sit.beneficiary);
    const benefName =
      sit.beneficiary === "white" ? whiteName : blackName;

    return pick(seed, 4, [
      [
        [
          playerSeg(benefName, sit.beneficiary),
          textSeg(" took over on "),
          moveSeg(km),
          textSeg(` — ${slip} (${swing}) — and ${gained} held the edge after.`),
        ],
        accuracyLine(wAcc, bAcc),
      ],
      [
        [
          textSeg("The position shifted on "),
          moveSeg(km),
          textSeg(` and stayed there — a real sustained advantage, not one slip.`),
        ],
        accuracyLine(wAcc, bAcc),
      ],
    ]);
  }

  if (sit.kind === "earned_wide") {
    if (sit.moment) {
      const km = sit.moment;
      const slip = slipLabel(km.classification);
      const swing = swingPhraseShort(km.swing);
      return [
        [
          playerSeg(leaderName, accLeader),
          textSeg(` were sharper overall (${wAcc.toFixed(0)}% vs ${bAcc.toFixed(0)}%).`),
        ],
        [
          textSeg("Biggest swing: "),
          moveSeg(km),
          textSeg(` (${slip}, ${swing}).`),
        ],
      ];
    }
    return [
      [
        playerSeg(leaderName, accLeader),
        textSeg(
          ` were clearly sharper (${wAcc.toFixed(0)}% vs ${bAcc.toFixed(0)}%) — outplayed across the game.`
        ),
      ],
    ];
  }

  if (sit.kind === "close_fight" && sit.moment) {
    const km = sit.moment;
    const slip = slipLabel(km.classification);
    const swing = swingPhraseShort(km.swing);
    return pick(seed, 6, [
      [
        [textSeg("A close game on accuracy.")],
        [
          textSeg("It turned on "),
          moveSeg(km),
          textSeg(` (${slip}, ${swing}).`),
        ],
      ],
      [
        [
          textSeg("Tight throughout — the key swing was "),
          moveSeg(km),
          textSeg("."),
        ],
      ],
    ]);
  }

  if (sit.kind === "even") {
    return [[textSeg("Very tight on accuracy — small details decided it.")]];
  }

  const arc = buildNarrativeBody(summary, whiteName, blackName, seed);
  return [arc];
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
  return {
    lines: composeStory(summary, moves, whiteName, blackName, seed),
  };
}

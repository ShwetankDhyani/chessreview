import { isDeliveredCheckmate } from "../analysis/mateDetection";
import type { AnalyzedMove } from "../types";
import {
  bestLines,
  blunderLines,
  brilliantLines,
  excellentLines,
  goodLines,
  greatLines,
  inaccuracyLines,
  mistakeLines,
  renderLine,
} from "./coachPhraseBank";
import {
  commentarySeed,
  pickSeededLine,
  pickVariedLine,
  rememberCoachPhrase,
} from "./coachVariety";
import { formatWinChanceLoss } from "./evalDisplay";

export { commentarySeed } from "./coachVariety";

export type PositionOutlook =
  | "winning_mate"
  | "crushing"
  | "comfortable"
  | "slight_edge"
  | "level"
  | "slight_down"
  | "trouble"
  | "desperate"
  | "losing_mate";

export function playerCp(move: AnalyzedMove, when: "before" | "after"): number {
  const e = when === "before" ? move.evalBefore : move.evalAfter;
  if (!e) return 0;
  if (e.mate !== undefined) {
    const whiteWinning = e.mate > 0;
    const playerWinning = move.color === "w" ? whiteWinning : !whiteWinning;
    const sign = playerWinning ? 1 : -1;
    return sign * (9000 - Math.min(Math.abs(e.mate), 20) * 400);
  }
  const cp = e.cp ?? 0;
  return move.color === "w" ? cp : -cp;
}

export function getPositionOutlook(
  move: AnalyzedMove,
  when: "before" | "after" = "after"
): PositionOutlook {
  const e = when === "before" ? move.evalBefore : move.evalAfter;
  if (!e) return "level";
  if (e.mate !== undefined) {
    const whiteWinning = e.mate > 0;
    const playerWinning = move.color === "w" ? whiteWinning : !whiteWinning;
    return playerWinning ? "winning_mate" : "losing_mate";
  }
  const cp = playerCp(move, when);
  if (cp >= 400) return "crushing";
  if (cp >= 200) return "comfortable";
  if (cp >= 50) return "slight_edge";
  if (cp >= -50) return "level";
  if (cp >= -200) return "slight_down";
  if (cp >= -400) return "trouble";
  return "desperate";
}

function isAlreadyLost(outlook: PositionOutlook): boolean {
  return outlook === "trouble" || outlook === "desperate" || outlook === "losing_mate";
}

function isAlreadyWinning(outlook: PositionOutlook): boolean {
  return (
    outlook === "crushing" ||
    outlook === "comfortable" ||
    outlook === "winning_mate"
  );
}

function stillLosingAfter(outlook: PositionOutlook): boolean {
  return (
    outlook === "slight_down" ||
    outlook === "trouble" ||
    outlook === "desperate" ||
    outlook === "losing_mate"
  );
}

export function describePositionForCoach(move: AnalyzedMove): string {
  const before = getPositionOutlook(move, "before");
  const after = getPositionOutlook(move, "after");
  const cpBefore = (playerCp(move, "before") / 100).toFixed(1);
  const cpAfter = (playerCp(move, "after") / 100).toFixed(1);
  const lines: string[] = [
    `Eval for the student before → after: ${cpBefore} → ${cpAfter} (positive = student better).`,
    `Before the move: ${before.replace(/_/g, " ")}. After: ${after.replace(/_/g, " ")}.`,
  ];

  if (move.classification === "brilliant" && stillLosingAfter(after)) {
    lines.push(
      "Tone: admire the idea, but do not pretend the game is fine — e.g. brilliance that may be too late."
    );
  } else if (move.classification === "blunder" && isAlreadyLost(before)) {
    lines.push(
      "Tone: matter-of-fact; the game was already bad — no false hope or melodrama."
    );
  } else if (
    (move.classification === "best" || move.classification === "excellent") &&
    isAlreadyWinning(before)
  ) {
    lines.push("Tone: calm satisfaction — converting a good position, not over-celebrating.");
  } else if (move.classification === "mistake" && isAlreadyLost(before)) {
    lines.push(
      "Tone: the position was already difficult; this move makes recovery harder — stay honest."
    );
  }

  lines.push(
    "Banned clichés (never use): clean and precise, accurate and well timed, timely and precise, solid technique, exactly what the position demanded, engine's top choice."
  );

  return lines.join("\n");
}

/** Position-aware fallback when Gemini is off or fails */
export function getPositionAwareMoveComment(
  move: AnalyzedMove,
  moveIdx = 0,
  openingHint?: string,
  trackUsage = true
): string | null {
  const c = move.classification;
  if (!c) return null;

  if (isDeliveredCheckmate(move.fenAfter)) {
    return `${move.san} — checkmate. The game is over.`;
  }

  const seed = commentarySeed(move, moveIdx);
  const { san, bestMoveSan: best } = move;
  const loss = Math.abs(move.deltaE);
  const lossBit =
    formatWinChanceLoss(loss) != null ? ` (${formatWinChanceLoss(loss)})` : "";
  const before = getPositionOutlook(move, "before");
  const after = getPositionOutlook(move, "after");
  const lostBefore = isAlreadyLost(before);
  const wonBefore = isAlreadyWinning(before);
  const losingAfter = stillLosingAfter(after);

  const pick = (builders: ReturnType<typeof brilliantLines>) => {
    const rendered = builders.map((b) => renderLine(b, san, best));
    const line = trackUsage
      ? pickVariedLine(seed, rendered)
      : pickSeededLine(seed, rendered);
    if (trackUsage) rememberCoachPhrase(line);
    return line;
  };

  switch (c) {
    case "brilliant":
      return pick(
        brilliantLines(move, {
          late: losingAfter && (lostBefore || before === "slight_down"),
          winning: wonBefore,
        })
      );
    case "great":
      return pick(greatLines({ late: losingAfter && lostBefore }));
    case "best":
      return pick(bestLines({ winning: wonBefore }));
    case "excellent":
      return pick(excellentLines(san, best));
    case "good":
      return pick(goodLines(san, best));
    case "book": {
      const bookLines = openingHint
        ? [
            `${san} — ${openingHint}`,
            `${san} — still in known ${openingHint} territory.`,
            `${san} — theory territory; both sides have seen this.`,
          ]
        : [
            `${san} — still in known theory.`,
            `${san} — a standard book move here.`,
            `${san} — mainline stuff. Nothing surprising yet.`,
          ];
      const bookLine = trackUsage
        ? pickVariedLine(seed, bookLines)
        : pickSeededLine(seed, bookLines);
      if (trackUsage) rememberCoachPhrase(bookLine);
      return bookLine;
    }
    case "inaccuracy":
      return pick(inaccuracyLines(san, best, lossBit, lostBefore));
    case "mistake":
      return pick(mistakeLines(san, best, lossBit, lostBefore));
    case "blunder":
      return pick(blunderLines(san, best, lossBit, lostBefore, wonBefore));
    default:
      return null;
  }
}

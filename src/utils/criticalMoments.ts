import type { AnalyzedMove, MoveClassification } from "../types";
import { moverWinChanceDeltaPercent } from "./evalDisplay";

export interface CriticalMoment {
  idx: number;
  move: AnalyzedMove;
  /** Absolute win-chance swing in percentage points (mover POV). */
  swingPct: number;
  kind: "swing" | "highlight";
}

const HIGHLIGHT: ReadonlySet<NonNullable<MoveClassification>> = new Set([
  "brilliant",
  "great",
  "miss",
  "blunder",
  "mistake",
]);

/**
 * Top critical plies for the Review panel: biggest win-chance swings and
 * severity highlights (brilliant / miss / blunder / …).
 */
export function pickCriticalMoments(
  moves: AnalyzedMove[],
  limit = 6
): CriticalMoment[] {
  const scored: CriticalMoment[] = [];

  for (let idx = 0; idx < moves.length; idx++) {
    const move = moves[idx]!;
    const c = move.classification;
    if (!c || c === "book" || move.forced) continue;

    const swingPct = Math.abs(moverWinChanceDeltaPercent(move));
    const isHighlight = HIGHLIGHT.has(c);
    if (!isHighlight && swingPct < 8) continue;

    scored.push({
      idx,
      move,
      swingPct,
      kind: isHighlight ? "highlight" : "swing",
    });
  }

  scored.sort((a, b) => {
    const sev = severityRank(b.move.classification) - severityRank(a.move.classification);
    if (sev !== 0) return sev;
    return b.swingPct - a.swingPct;
  });

  return scored.slice(0, limit);
}

function severityRank(c: MoveClassification): number {
  switch (c) {
    case "blunder":
      return 6;
    case "miss":
      return 5;
    case "brilliant":
      return 4;
    case "mistake":
      return 3;
    case "great":
      return 2;
    case "inaccuracy":
      return 1;
    default:
      return 0;
  }
}
